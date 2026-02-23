import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { MockDataProviderService } from './services/mock-data-provider.service';
import { HttpDataProviderService } from './services/http-data-provider.service';
import { DATA_PROVIDER } from './services/data-provider.factory';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        MockDataProviderService,
        HttpDataProviderService,
        provideAnimationsAsync(),
        provideHttpClient(),
        {
          provide: DATA_PROVIDER,
          useFactory: (mockProvider: MockDataProviderService) => mockProvider,
          deps: [MockDataProviderService]
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('RTA Analysis Toolkit');
  });
});
