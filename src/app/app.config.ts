import { ApplicationConfig } from "@angular/core";
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync  } from "@angular/platform-browser/animations/async";
import { provideHttpClient } from "@angular/common/http";

import { routes } from './app.routes';
import { DATA_PROVIDER, createDataProvider } from "./services/data-provider.factory";
import { MockDataProviderService } from "./services/mock-data-provider.service";
import { HttpDataProviderService } from "./services/http-data-provider.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync (),  // Required for angular material
    provideHttpClient(),  // Required for HTTP operations

    // Data provider configuration
    {
      provide: DATA_PROVIDER,
      useFactory: (mockProvider: MockDataProviderService, httpProvider: HttpDataProviderService) => {
        return createDataProvider(
          { mode: 'mock'},  // Change to 'http' once API is ready
            mockProvider,
            httpProvider
        );
      },
      deps: [MockDataProviderService, HttpDataProviderService]
        
    }
  ]
};