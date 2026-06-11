import type { FeedProvider, NetworkProvider, PowerProvider, TouristProvider } from "./types.js";
import { CivilUnrestProvider } from "./civil-unrest-provider.js";
import { CommunityReportsProvider } from "./community-provider.js";
import { CrimeWebIntelligenceProvider } from "./crime-provider.js";
import { ConnectivityProvider } from "./network-provider.js";
import { LoadSheddingProvider } from "./power-provider.js";
import { TouristPoiProvider } from "./tourist-provider.js";
import { TransportDisruptionProvider } from "./transport-provider.js";
import { WeatherRiskProvider } from "./weather-provider.js";

export const feedProviders: FeedProvider[] = [
  new CrimeWebIntelligenceProvider(),
  new WeatherRiskProvider(),
  new CivilUnrestProvider(),
  new TransportDisruptionProvider(),
  new CommunityReportsProvider()
];

export const powerProvider: PowerProvider = new LoadSheddingProvider();

export const networkProvider: NetworkProvider = new ConnectivityProvider();

export const touristProvider: TouristProvider = new TouristPoiProvider();
