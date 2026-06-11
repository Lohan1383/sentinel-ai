import type {
  Coordinates,
  FeedEvent,
  NetworkStatus,
  PowerStatus,
  TouristPoi
} from "@sentinel/shared";

export interface FeedProvider {
  readonly name: string;
  fetchEvents(location: Coordinates): Promise<FeedEvent[]>;
}

export interface PowerProvider {
  readonly name: string;
  fetchPowerStatus(location: Coordinates): Promise<PowerStatus>;
}

export interface NetworkProvider {
  readonly name: string;
  fetchNetworkStatus(location: Coordinates): Promise<NetworkStatus>;
}

export interface TouristProvider {
  readonly name: string;
  fetchPois(location: Coordinates): Promise<TouristPoi[]>;
}
