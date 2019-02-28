'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NotebookGradingController = function () {
    function NotebookGradingController($rootScope, $scope, $state, ConfigService, NotebookService, ProjectService, StudentStatusService, TeacherDataService, TeacherWebSocketService) {
        _classCallCheck(this, NotebookGradingController);

        this.$rootScope = $rootScope;
        this.$scope = $scope;
        this.$state = $state;
        this.ConfigService = ConfigService;
        this.NotebookService = NotebookService;
        this.ProjectService = ProjectService;
        this.StudentStatusService = StudentStatusService;
        this.TeacherDataService = TeacherDataService;
        this.TeacherWebSocketService = TeacherWebSocketService;
        this.themePath = this.ProjectService.getThemePath();
        this.teacherWorkgroupId = this.ConfigService.getWorkgroupId();
        this.workgroups = this.ConfigService.getClassmateUserInfos();
        this.notebookConfig = this.NotebookService.getStudentNotebookConfig();
        this.showAllNotes = false;
        this.showAllReports = false;
        this.showNoteForWorkgroup = {};
        this.showReportForWorkgroup = {};
        for (var i = 0; i < this.workgroups.length; i++) {
            var workgroup = this.workgroups[i];
            this.showNoteForWorkgroup[workgroup.workgroupId] = false;
            this.showReportForWorkgroup[workgroup.workgroupId] = false;
        }

        this.canViewStudentNames = true;
        this.canGradeStudentWork = true;

        // get the role of the teacher for the run e.g. 'owner', 'write', 'read'
        var role = this.ConfigService.getTeacherRole(this.teacherWorkgroupId);

        if (role === 'owner') {
            // the teacher is the owner of the run and has full access
            this.canViewStudentNames = true;
            this.canGradeStudentWork = true;
        } else if (role === 'write') {
            // the teacher is a shared teacher that can grade the student work
            this.canViewStudentNames = true;
            this.canGradeStudentWork = true;
        } else if (role === 'read') {
            // the teacher is a shared teacher that can only view the student work
            this.canViewStudentNames = false;
            this.canGradeStudentWork = false;
        }

        // save event when notebook grading view is displayed
        var context = "ClassroomMonitor",
            nodeId = null,
            componentId = null,
            componentType = null,
            category = "Navigation",
            event = "notebookViewDisplayed",
            data = {};
        this.TeacherDataService.saveEvent(context, nodeId, componentId, componentType, category, event, data);
    }

    _createClass(NotebookGradingController, [{
        key: 'toggleDisplayNoteForWorkgroup',
        value: function toggleDisplayNoteForWorkgroup(workgroupId) {
            this.showNoteForWorkgroup[workgroupId] = !this.showNoteForWorkgroup[workgroupId];
        }
    }, {
        key: 'toggleDisplayReportForWorkgroup',
        value: function toggleDisplayReportForWorkgroup(workgroupId) {
            this.showReportForWorkgroup[workgroupId] = !this.showReportForWorkgroup[workgroupId];
        }
    }, {
        key: 'toggleDisplayAllNotes',
        value: function toggleDisplayAllNotes() {
            this.showAllNotes = !this.showAllNotes;

            for (var workgroupId in this.showNoteForWorkgroup) {
                this.showNoteForWorkgroup[workgroupId] = this.showAllNotes;
            }
        }
    }, {
        key: 'toggleDisplayAllReports',
        value: function toggleDisplayAllReports() {
            this.showAllReports = !this.showAllReports;
            for (var workgroupId in this.showReportForWorkgroup) {
                this.showReportForWorkgroup[workgroupId] = this.showAllReports;
            }
        }
    }, {
        key: 'viewNotes',
        value: function viewNotes(workgroupId) {
            alert(workgroupId);
        }
    }, {
        key: 'viewReport',
        value: function viewReport(workgroupId) {
            alert(workgroupId);
        }
    }, {
        key: 'getCurrentPeriod',
        value: function getCurrentPeriod() {
            return this.TeacherDataService.getCurrentPeriod();
        }
    }, {
        key: 'getNotebookForWorkgroup',
        value: function getNotebookForWorkgroup(workgroupId) {
            return this.NotebookService.getNotebookByWorkgroup(workgroupId);
        }
    }, {
        key: 'getNotebookConfigForWorkgroup',
        value: function getNotebookConfigForWorkgroup(workgroupId) {
            if (this.ConfigService.isRunOwner(workgroupId) || this.ConfigService.isRunSharedTeacher(workgroupId)) {
                return this.NotebookService.getTeacherNotebookConfig();
            } else {
                return this.NotebookService.getStudentNotebookConfig();
            }
        }
    }]);

    return NotebookGradingController;
}();

NotebookGradingController.$inject = ['$rootScope', '$scope', '$state', 'ConfigService', 'NotebookService', 'ProjectService', 'StudentStatusService', 'TeacherDataService', 'TeacherWebSocketService'];

exports.default = NotebookGradingController;
//# sourceMappingURL=notebookGradingController.js.map
