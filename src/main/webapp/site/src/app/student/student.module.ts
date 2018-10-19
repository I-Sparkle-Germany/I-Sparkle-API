import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MomentModule } from 'ngx-moment';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule,
  MatTabsModule } from '@angular/material';

const materialModules = [
  MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule,
  MatTabsModule
];

import { SharedModule } from "../modules/shared/shared.module";
import { StudentRoutingModule } from './student-routing.module';
import { StudentComponent } from './student.component';
import { StudentHomeComponent } from './student-home/student-home.component';
import { StudentEditProfileComponent } from './student-edit-profile/student-edit-profile.component';
import { StudentRunListComponent } from './student-run-list/student-run-list.component';
import { StudentRunListItemComponent } from './student-run-list-item/student-run-list-item.component';
import { AuthGuard } from "./auth.guard";
import { AddProjectDialogComponent } from "./add-project-dialog/add-project-dialog.component";
import { EditComponent } from './account/edit/edit.component';
import { EditProfileComponent } from './account/edit-profile/edit-profile.component';
import { EditPasswordComponent } from './account/edit-password/edit-password.component';
import { TimelineModule } from "../modules/timeline/timeline.module";

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    MomentModule,
    materialModules,
    SharedModule,
    StudentRoutingModule,
    TimelineModule
  ],
  declarations: [
    AddProjectDialogComponent,
    StudentComponent,
    StudentHomeComponent,
    StudentEditProfileComponent,
    StudentRunListComponent,
    StudentRunListItemComponent,
    EditComponent,
    EditProfileComponent,
    EditPasswordComponent
  ],
  entryComponents: [
    AddProjectDialogComponent
  ],
  providers: [
    AuthGuard
  ],
  exports: [
    StudentComponent,
    materialModules
  ]
})
export class StudentModule { }
