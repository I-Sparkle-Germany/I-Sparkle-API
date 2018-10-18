import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherProjectLibraryComponent } from './teacher-project-library.component';
import { MatMenuModule } from "@angular/material";
import { LibraryService } from "../../../services/library.service";
import { fakeAsyncResponse } from "../../../student/student-run-list/student-run-list.component.spec";

import { NO_ERRORS_SCHEMA } from "@angular/core";
import { ConfigService } from "../../../services/config.service";
import { Config } from "../../../domain/config";
import { Observable } from 'rxjs';

export class MockLibraryService {
  tabIndexSource$ = fakeAsyncResponse(1);
}

export class MockConfigService {
  getConfig(): Observable<Config> {
    const config: Config = {
      contextPath: "/wise",
      logOutURL: "/logout",
      currentTime: 20180730
    };
    return Observable.create(observer => {
      observer.next(config);
      observer.complete();
    });
  }
  getContextPath(): string {
    return "";
  }
}

describe('TeacherProjectLibraryComponent', () => {
  let component: TeacherProjectLibraryComponent;
  let fixture: ComponentFixture<TeacherProjectLibraryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ MatMenuModule ],
      declarations: [ TeacherProjectLibraryComponent ],
      providers: [
        { provide: LibraryService, useClass: MockLibraryService },
        { provide: ConfigService, useClass: MockConfigService }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeacherProjectLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
