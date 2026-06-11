import type {
  AlertNotification,
  DashboardState,
  GeoPoint,
  IncidentUploadInput,
  IncidentVerificationResult,
  PointOfInterest,
  RiskEvent,
  RouteVector,
  UserTier
} from "@sentinel/shared";
import { getFeatureAccess } from "@sentinel/shared";
import { EventAggregatorService } from "./event-aggregator.service";
import { LoadSheddingService } from "./load-shedding.service";
import { NetworkStatusService } from "./network-status.service";
import { CrimeIntelligenceService } from "./crime-intel.service";
import { RiskScoreService } from "./risk-score.service";
import { AlertService } from "./alert.service";
import { GeofenceService } from "./geofence.service";
import { IncidentVerificationService } from "./incident-verification.service";
import { TouristModeService } from "./tourist-mode.service";
import type { IncidentStore } from "../repositories/incident-store";

export class IntelligenceService {
  constructor(
    private readonly eventAggregator: EventAggregatorService,
    private readonly loadShedding: LoadSheddingService,
    private readonly network: NetworkStatusService,
    private readonly crimeIntel: CrimeIntelligenceService,
    private readonly riskScore: RiskScoreService,
    private readonly alerts: AlertService,
    private readonly geofence: GeofenceService,
    private readonly incidentVerification: IncidentVerificationService,
    private readonly touristMode: TouristModeService,
    private readonly incidentPublishThreshold: number,
    private readonly incidentStore: IncidentStore
  ) {}

  private async collectEvents(location: GeoPoint, radiusKm: number): Promise<RiskEvent[]> {
    const signals = await this.eventAggregator.getEvents(location, radiusKm);
    const localReports = this.incidentStore.listNearby(location, 0.5);

    const deduped = new Map<string, RiskEvent>();
    for (const event of [...signals, ...localReports]) {
      deduped.set(event.id, event);
    }

    return [...deduped.values()].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  }

  async getFeed(location: GeoPoint, tier: UserTier, tourist = false): Promise<RiskEvent[]> {
    const events = await this.collectEvents(location, 25);
    const access = getFeatureAccess(tier);

    let filtered = events;
    if (!access.incidentUploadPriority) {
      filtered = filtered.filter((event) => event.type !== "verified_user_report" || (event.confidenceScore ?? 0) >= 0.75);
    }

    if (tourist) {
      const touristFeed = this.touristMode.rewriteEvents(filtered);
      if (access.touristModeLimited) {
        return touristFeed.slice(0, 25);
      }

      return touristFeed;
    }

    return filtered;
  }

  async getDashboard(location: GeoPoint, tier: UserTier): Promise<DashboardState & { notes: string[] }> {
    const events = await this.getFeed(location, tier);
    const loadShedding = this.loadShedding.getStatus(location);
    const network = this.network.getStatus(location);

    const crime = this.crimeIntel.evaluate(location, events);
    const risk = this.riskScore.calculate(events, crime.factor, loadShedding, network);
    const alerts = this.alerts.getAlerts(events, risk, loadShedding, network);

    return {
      location,
      risk,
      activeAlerts: alerts,
      loadShedding,
      network,
      notes: crime.notes
    };
  }

  async getAlerts(location: GeoPoint, tier: UserTier): Promise<AlertNotification[]> {
    const dashboard = await this.getDashboard(location, tier);
    const geoAlerts = this.geofence.check({ location, tier });
    const access = getFeatureAccess(tier);
    const combined = [...dashboard.activeAlerts, ...geoAlerts];

    if (!access.priorityAlerts) {
      return combined.slice(0, 6);
    }

    const priority = { low: 1, medium: 2, high: 3, critical: 4 } as const;
    return combined.sort((a, b) => priority[b.severity] - priority[a.severity]).slice(0, 12);
  }

  checkGeofence(location: GeoPoint, tier: UserTier, route?: RouteVector): AlertNotification[] {
    return this.geofence.check({
      location,
      tier,
      route
    });
  }

  submitIncident(input: IncidentUploadInput): { verification: IncidentVerificationResult; publishedEvent?: RiskEvent } {
    const existing = this.incidentStore.listAll();
    const verification = this.incidentVerification.verify(input, existing, this.incidentPublishThreshold);

    const event = this.incidentVerification.toEvent(input, verification);
    if (verification.shouldPublish) {
      this.incidentStore.add(event);
      return {
        verification,
        publishedEvent: event
      };
    }

    return { verification };
  }

  getTouristOverlay(location: GeoPoint, tier: UserTier): PointOfInterest[] {
    const points = this.touristMode.getOverlay(location);
    if (tier === "free") {
      return points.slice(0, 2);
    }

    return points;
  }
}
