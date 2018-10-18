import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { LibraryProject } from "../libraryProject";
import { LibraryService } from "../../../services/library.service";
import { ConfigService } from "../../../services/config.service";

@Component({
  selector: 'app-teacher-project-library',
  templateUrl: './teacher-project-library.component.html',
  styleUrls: [
    './teacher-project-library.component.scss',
    '../library/library.component.scss'
  ],
  encapsulation: ViewEncapsulation.None
})
export class TeacherProjectLibraryComponent implements OnInit {

  projects: LibraryProject[] = [];
  selectedTabIndex: number = 0;
  numberOfOfficialProjectsVisible;
  numberOfCommunityProjectsVisible;
  numberOfPersonalProjectsVisible;
  authoringToolLink: string;

  constructor(private libraryService: LibraryService,
              private configService: ConfigService) {
    libraryService.tabIndexSource$.subscribe((tabIndex) => {
      this.selectedTabIndex = tabIndex;
    })
  }

  ngOnInit() {
    this.configService.getConfig().subscribe((config) => {
      if (config != null) {
        this.authoringToolLink = `${this.configService.getContextPath()}/author`;
      }
    });
  }

  updateNumberOfOfficialProjectsVisible(count) {
    this.numberOfOfficialProjectsVisible = count;
  }

  updateNumberOfCommunityProjectsVisible(count) {
    this.numberOfCommunityProjectsVisible = count;
  }

  updateNumberOfPersonalProjectsVisible(count) {
    this.numberOfPersonalProjectsVisible = count;
  }

}
