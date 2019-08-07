'use strict';

class SummaryDisplayController {
  constructor($filter, $injector, $q, ConfigService, ProjectService) {
    this.$filter = $filter;
    this.$injector = $injector;
    this.$q = $q;
    this.ConfigService = ConfigService;
    this.ProjectService = ProjectService;
    this.$translate = this.$filter('translate');
    this.dataService = null;
    if (this.chartType == null) {
      this.chartType = 'column';
    }
    const mode = this.ConfigService.getMode();
    if (this.ConfigService.isPreview() || mode === 'studentRun') {
      this.dataService = this.$injector.get('StudentDataService');
    } else if (mode === 'classroomMonitor' || mode === 'author') {
      this.dataService = this.$injector.get('TeacherDataService'); 
    }
    this.renderDisplay();
    if (mode === 'author') {
      this.$onChanges = (changes) => {
        this.renderDisplay();
      }
    }
  }

  renderDisplay() {
    const summaryComponent = 
        this.ProjectService.getComponentByNodeIdAndComponentId(this.nodeId, this.componentId);
    if (summaryComponent != null) {
      this.getComponentStates(this.nodeId, this.componentId, this.periodId)
          .then((componentStates = []) => {
        this.processComponentStates(componentStates);
      });
    } else {
      this.clearChartConfig();
    }
  }

  clearChartConfig() {
    this.chartConfig = {
      options: {
        legend: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        credits: {
          enabled: false
        }
      }
    };
  }

  getComponentStates(nodeId, componentId, periodId) {
    if (this.isVLEPreview()) {
      return this.getDummyStudentWorkForVLEPreview(nodeId, componentId);
    } else if (this.isAuthoringPreview()) {
      return this.getDummyStudentWorkForAuthoringPreview(nodeId, componentId);
    } else if (this.isStudentRun()) {
      return this.dataService.getClassmateStudentWork(nodeId, componentId, periodId);
    } else if (this.isClassroomMonitor()) {
      return this.dataService.retrieveLatestStudentDataByNodeIdAndComponentIdAndPeriodId(
          nodeId, componentId, periodId);
    }
  }

  isVLEPreview() {
    return this.ConfigService.isPreview();
  }

  isAuthoringPreview() {
    return this.ConfigService.getMode() === 'author';
  }

  isStudentRun() {
    return this.ConfigService.getMode() === 'studentRun';
  }

  isClassroomMonitor() {
    return this.ConfigService.getMode() === 'classroomMonitor';
  }

  getDummyStudentWorkForVLEPreview(nodeId, componentId) {
    const componentStates = this.createDummyClassmateStudentWork();
    const componentState = this.dataService
        .getLatestComponentStateByNodeIdAndComponentId(nodeId, componentId);
    if (componentState != null) {
      componentStates.push(componentState);
    }
    return this.resolveComponentStates(componentStates);
  }

  getDummyStudentWorkForAuthoringPreview() {
    const componentStates = this.createDummyClassmateStudentWork();
    return this.resolveComponentStates(componentStates);
  }

  resolveComponentStates(componentStates) {
    const deferred = this.$q.defer();
    // We need to set a delay otherwise the graph won't render properly
    setTimeout(() => {
      deferred.resolve(componentStates);
    }, 1);
    return deferred.promise;
  }

  createDummyClassmateStudentWork() {
    const component = this.ProjectService.getComponentByNodeIdAndComponentId(
        this.nodeId, this.componentId);
    const choices = component.choices;
    const dummyComponentStates = [];
    for (let dummyCounter = 0; dummyCounter < 20; dummyCounter++) {
      dummyComponentStates.push(this.createDummyComponentState(choices));
    }
    return dummyComponentStates;
  }

  createDummyComponentState(choices) {
    return {
      studentData: {
        studentChoices: [
          { id: this.getRandomChoice(choices).id }
        ]
      }
    }; 
  }
  
  getRandomChoice(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  processComponentStates(componentStates) {
    const component = this.ProjectService.getComponentByNodeIdAndComponentId(
        this.nodeId, this.componentId);
    const summaryData = this.createSummaryData(component, componentStates);
    const { data, total } = this.createSeriesData(component, summaryData);
    const series = this.createSeries(data);
    const chartType = this.chartType;
    const title = this.$translate('CLASS_RESULTS');
    const xAxisType = 'category';
    this.chartConfig =  this.createChartConfig(chartType, title, xAxisType, total, series);
    this.numResponses = componentStates.length;
    this.totalWorkgroups = this.getTotalWorkgroups(componentStates);
    this.percentResponded = this.getPercentResponded(this.numResponses, this.totalWorkgroups);
  }

  getTotalWorkgroups(componentStates) {
    const numComponentStates = componentStates.length;
    if (this.ConfigService.isPreview() || this.ConfigService.getMode() === 'author') {
      return numComponentStates;
    } else {
      const numWorkgroups = this.ConfigService.getNumberOfWorkgroupsInPeriod(this.periodId);
      return Math.max(numWorkgroups, numComponentStates);
    }
  }

  getPercentResponded(numResponses, totalWorkgroups) {
    return Math.floor(100 * numResponses / totalWorkgroups);
  }

  createSummaryData(component, componentStates) {
    const summaryData = {};
    for (const choice of component.choices) {
      summaryData[choice.id] = this.createChoiceSummaryData(
          choice.id, choice.text, choice.isCorrect);
    }
    for (const componentState of componentStates) {
      this.addComponentStateDataToSummaryData(summaryData, componentState);
    }
    return summaryData;
  }

  createChoiceSummaryData(id, text, isCorrect) {
    return {
      id: id,
      text: text,
      isCorrect: isCorrect,
      count: 0
    };
  }

  addComponentStateDataToSummaryData(summaryData, componentState) {
    for (const choice of componentState.studentData.studentChoices) {
      this.incrementSummaryData(summaryData, choice.id);
    }
  }

  incrementSummaryData(summaryData, id) {
    summaryData[id].count += 1;
  }

  getSummaryDataCount(summaryData, id) {
    return summaryData[id].count;
  }

  createChartConfig(chartType, title, xAxisType, total, series) {
    const chartConfig = {
      options: {
        chart: {
          type: chartType
        },
        legend: {
          enabled: false
        },
        tooltip: {
          formatter: function(s, point) {
            return this.key + ': ' + Math.round(100 * this.y / total) + '%';
          }
        },
        exporting: {
          enabled: false
        },
        credits: {
          enabled: false
        }
      },
      title: {
        text: title
      },
      xAxis: {
        type: xAxisType
      },
      yAxis: {
        title: {
          text: this.$translate('COUNT')
        }
      },
      series: series
    };
    if (chartType === 'pie') {
      chartConfig.options.plotOptions = {
        pie: {
          dataLabels: {
            enabled: true,
            format: '<br>{point.name}</b>: {point.y}'
          }
        }
      };
    }
    return chartConfig;
  }

  hasCorrectAnswer(component) {
    for (const choice of component.choices) {
      if (choice.isCorrect) {
        return true;
      }
    }
    return false;
  }

  createSeriesData(component, summaryData) {
    const data = [];
    let total = 0;
    const hasCorrectness = this.hasCorrectAnswer(component);
    for (const choice of component.choices) {
      const count = this.getSummaryDataCount(summaryData, choice.id);
      total += count;
      const color = this.getDataPointColor(choice, hasCorrectness);
      const dataPoint = this.createDataPoint(choice.text, count, color);
      data.push(dataPoint);
    }
    return { data: data, total: total };
  }

  getDataPointColor(choice, hasCorrectness) {
    let color = null;
    if (hasCorrectness) {
      if (choice.isCorrect) {
        color = 'green';
      } else {
        color = 'red';
      }
    }
    return color;
  }
  
  createDataPoint(name, y, color) {
    return {
      name: name,
      y: y,
      color: color
    };
  }

  createSeries(data) {
    return [{
      data: data,
      dataLabels: {
        enabled: true
      }
    }];
  }
}

SummaryDisplayController.$inject = [
  '$filter',
  '$injector',
  '$q',
  'ConfigService',
  'ProjectService',
  'StudentDataService'
];

const SummaryDisplay = {
  bindings: {
    nodeId: '<',
    componentId: '<',
    periodId: '<',
    chartType: '<'
  },
  templateUrl: 'wise5/directives/summaryDisplay/summaryDisplay.html',
  controller: SummaryDisplayController,
  controllerAs: 'summaryDisplayCtrl'
}

export default SummaryDisplay;