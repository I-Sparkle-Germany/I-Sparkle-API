'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _componentService = require('../componentService');

var _componentService2 = _interopRequireDefault(_componentService);

var _html2canvas = require('html2canvas');

var _html2canvas2 = _interopRequireDefault(_html2canvas);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GraphService = function (_ComponentService) {
  _inherits(GraphService, _ComponentService);

  function GraphService($filter, $q, StudentAssetService, StudentDataService, UtilService) {
    _classCallCheck(this, GraphService);

    var _this = _possibleConstructorReturn(this, (GraphService.__proto__ || Object.getPrototypeOf(GraphService)).call(this, $filter, StudentDataService, UtilService));

    _this.$q = $q;
    _this.StudentAssetService = StudentAssetService;
    return _this;
  }

  _createClass(GraphService, [{
    key: 'getComponentTypeLabel',
    value: function getComponentTypeLabel() {
      return this.$translate('graph.componentTypeLabel');
    }

    /**
     * Create a Graph component object
     * @returns a new Graph component object
     */

  }, {
    key: 'createComponent',
    value: function createComponent() {
      var component = _get(GraphService.prototype.__proto__ || Object.getPrototypeOf(GraphService.prototype), 'createComponent', this).call(this);
      component.type = 'Graph';
      component.title = '';
      component.width = 800;
      component.height = 500;
      component.enableTrials = false;
      component.canCreateNewTrials = false;
      component.canDeleteTrials = false;
      component.hideAllTrialsOnNewTrial = false;
      component.canStudentHideSeriesOnLegendClick = false;
      component.roundValuesTo = 'integer';
      component.graphType = 'line';
      component.xAxis = {
        title: {
          text: this.$translate('graph.timeSeconds')
        },
        min: 0,
        max: 100,
        units: this.$translate('graph.secondsUnit'),
        locked: true,
        type: 'limits'
      };
      component.yAxis = {
        title: {
          text: this.$translate('graph.positionMeters')
        },
        min: 0,
        max: 100,
        units: this.$translate('graph.metersUnit'),
        locked: true
      };
      component.series = [{
        name: this.$translate('graph.prediction'),
        data: [],
        color: 'blue',
        dashStyle: 'Solid',
        marker: {
          symbol: 'circle'
        },
        regression: false,
        regressionSettings: {},
        canEdit: true
      }];
      return component;
    }

    /**
     * Code extracted from https://github.com/streamlinesocial/highcharts-regression
     * Loop through all the series that are passed in and find the ones that we
     * need to generate a regression series for. Return the regression series
     * that are generated in an array.
     * @param series an array of series
     * @return an array of regression series
     */

  }, {
    key: 'generateRegressionSeries',
    value: function generateRegressionSeries(series) {
      var regressionSeries = [];
      var i = 0;
      for (i = 0; i < series.length; i++) {
        var s = series[i];
        if (s.regression) {
          s.regressionSettings = s.regressionSettings || {};
          var regressionType = s.regressionSettings.type || "linear";
          var regression;

          var color = s.color;

          if (s.regressionSettings.color != null) {
            color = s.regressionSettings.color;
          }

          var extraSerie = {
            data: [],
            color: color,
            yAxis: s.yAxis,
            lineWidth: 2,
            marker: { enabled: false },
            isRegressionLine: true,
            name: s.regressionSettings.label || "Equation: %eq"
          };

          extraSerie.type = "spline";

          if (regressionType == "linear") {
            regression = this._linear(s.data, s.regressionSettings);
            extraSerie.type = "line";
          } else if (regressionType == "exponential") {
            regression = this._exponential(s.data, s.regressionSettings);
          } else if (regressionType == "polynomial") {
            regression = this._polynomial(s.data, 2, s.regressionSettings);
          } else if (regressionType == "logarithmic") {
            regression = this._logarithmic(s.data, s.regressionSettings);
          } else if (regressionType == "loess") {
            var loessSmooth = s.regressionSettings.loessSmooth || 25;
            regression = this._loess(s.data, loessSmooth / 100);
          } else {
            console.error("Invalid regression type: ", regressionType);
            break;
          }

          regression.rSquared = this.coefficientOfDetermination(s.data, regression.points).toFixed(2);
          regression.rValue = Math.sqrt(regression.rSquared, 2).toFixed(2);
          extraSerie.data = regression.points;
          extraSerie.name = extraSerie.name.replace("%r2", regression.rSquared);
          extraSerie.name = extraSerie.name.replace("%r", regression.rValue);
          extraSerie.name = extraSerie.name.replace("%eq", regression.string);

          extraSerie.regressionOutputs = regression;

          regressionSeries.push(extraSerie);
        }
      }

      return regressionSeries;
    }

    /**
     * Code extracted from https://github.com/Tom-Alexander/regression-js/
     */

  }, {
    key: '_exponential',
    value: function _exponential(data, regressionSettings) {
      var sum = [0, 0, 0, 0, 0, 0],
          n = 0,
          results = [];

      for (len = data.length; n < len; n++) {
        if (data[n]['x']) {
          data[n][0] = data[n]['x'];
          data[n][1] = data[n]['y'];
        }
        if (data[n][1]) {
          sum[0] += data[n][0]; // X
          sum[1] += data[n][1]; // Y
          sum[2] += data[n][0] * data[n][0] * data[n][1]; // XXY
          sum[3] += data[n][1] * Math.log(data[n][1]); // Y Log Y
          sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]); //YY Log Y
          sum[5] += data[n][0] * data[n][1]; //XY
        }
      }

      var denominator = sum[1] * sum[2] - sum[5] * sum[5];
      var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
      var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

      if (regressionSettings != null && regressionSettings.xMin != null && regressionSettings.xMax != null && regressionSettings.numberOfPoints != null) {

        //regression settings have been provided

        /*
         * get the xMin and xMax so we know over what range to plot
         * regression points for
         */
        var xMin = regressionSettings.xMin;
        var xMax = regressionSettings.xMax;

        //get the number of points that should be plotted on the regression line
        var numberOfPoints = regressionSettings.numberOfPoints;

        //get the distance between the xMin and xMax
        var xSpan = xMax - xMin;

        //calculate the points on the regression line
        for (var i = 0; i < numberOfPoints; i++) {
          var x = xMin + xSpan * (i / numberOfPoints);

          var coordinate = [x, A * Math.pow(Math.E, B * x)];
          results.push(coordinate);
        }
      } else {
        /*
         * regression settings have not been provided so we will use the default
         * x values for the regression points
         */
        for (var i = 0, len = data.length; i < len; i++) {
          var coordinate = [data[i][0], A * Math.pow(Math.E, B * data[i][0])];
          results.push(coordinate);
        }
      }

      results.sort(function (a, b) {
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
          return -1;
        }
        return 0;
      });

      var string = 'y = ' + Math.round(A * 100) / 100 + 'e^(' + Math.round(B * 100) / 100 + 'x)';

      return { equation: [A, B], points: results, string: string };
    }

    /**
     * Code extracted from https://github.com/Tom-Alexander/regression-js/
     * Human readable formulas:
     *
     *        N * Σ(XY) - Σ(X)
     * intercept = ---------------------
     *        N * Σ(X^2) - Σ(X)^2
     *
     * correlation = N * Σ(XY) - Σ(X) * Σ (Y) / √ (  N * Σ(X^2) - Σ(X) ) * ( N * Σ(Y^2) - Σ(Y)^2 ) ) )
     *
     */

  }, {
    key: '_linear',
    value: function _linear(data, regressionSettings) {
      var sum = [0, 0, 0, 0, 0],
          n = 0,
          results = [],
          N = data.length;

      for (; n < data.length; n++) {
        if (data[n]['x']) {
          data[n][0] = data[n]['x'];
          data[n][1] = data[n]['y'];
        }
        if (data[n][1]) {
          sum[0] += data[n][0]; //Σ(X)
          sum[1] += data[n][1]; //Σ(Y)
          sum[2] += data[n][0] * data[n][0]; //Σ(X^2)
          sum[3] += data[n][0] * data[n][1]; //Σ(XY)
          sum[4] += data[n][1] * data[n][1]; //Σ(Y^2)
        }
      }

      var gradient = (n * sum[3] - sum[0] * sum[1]) / (n * sum[2] - sum[0] * sum[0]);
      var intercept = sum[1] / n - gradient * sum[0] / n;
      //var correlation = (n * sum[3] - sum[0] * sum[1]) / Math.sqrt((n * sum[2] - sum[0] * sum[0]) * (n * sum[4] - sum[1] * sum[1]));

      if (regressionSettings != null && regressionSettings.xMin != null && regressionSettings.xMax != null && regressionSettings.numberOfPoints != null) {

        //regression settings have been provided

        /*
         * get the xMin and xMax so we know over what range to plot
         * regression points for
         */
        var xMin = regressionSettings.xMin;
        var xMax = regressionSettings.xMax;

        //get the number of points that should be plotted on the regression line
        var numberOfPoints = regressionSettings.numberOfPoints;

        //get the distance between the xMin and xMax
        var xSpan = xMax - xMin;

        //calculate the points on the regression line
        for (var i = 0; i < numberOfPoints; i++) {
          var x = xMin + xSpan * (i / numberOfPoints);

          var coordinate = [x, x * gradient + intercept];
          results.push(coordinate);
        }
      } else {
        /*
         * regression settings have not been provided so we will use the default
         * x values for the regression points
         */
        for (var i = 0, len = data.length; i < len; i++) {
          var coordinate = [data[i][0], data[i][0] * gradient + intercept];
          results.push(coordinate);
        }
      }

      results.sort(function (a, b) {
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
          return -1;
        }
        return 0;
      });

      var string = 'y = ' + Math.round(gradient * 100) / 100 + 'x + ' + Math.round(intercept * 100) / 100;
      return { equation: [gradient, intercept], points: results, string: string };
    }

    /**
     *  Code extracted from https://github.com/Tom-Alexander/regression-js/
     */

  }, {
    key: '_logarithmic',
    value: function _logarithmic(data, regressionSettings) {
      var sum = [0, 0, 0, 0],
          n = 0,
          results = [],
          mean = 0;

      for (len = data.length; n < len; n++) {
        if (data[n]['x']) {
          data[n][0] = data[n]['x'];
          data[n][1] = data[n]['y'];
        }
        if (data[n][1]) {
          sum[0] += Math.log(data[n][0]);
          sum[1] += data[n][1] * Math.log(data[n][0]);
          sum[2] += data[n][1];
          sum[3] += Math.pow(Math.log(data[n][0]), 2);
        }
      }

      var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
      var A = (sum[2] - B * sum[0]) / n;

      if (regressionSettings != null && regressionSettings.xMin != null && regressionSettings.xMax != null && regressionSettings.numberOfPoints != null) {

        //regression settings have been provided

        /*
         * get the xMin and xMax so we know over what range to plot
         * regression points for
         */
        var xMin = regressionSettings.xMin;
        var xMax = regressionSettings.xMax;

        //get the number of points that should be plotted on the regression line
        var numberOfPoints = regressionSettings.numberOfPoints;

        //get the distance between the xMin and xMax
        var xSpan = xMax - xMin;

        //calculate the points on the regression line
        for (var i = 0; i < numberOfPoints; i++) {
          var x = xMin + xSpan * (i / numberOfPoints);

          if (x > 0) {
            var y = A + B * Math.log(x);

            if (!isNaN(y)) {
              var coordinate = [x, y];
              results.push(coordinate);
            }
          }
        }
      } else {
        /*
         * regression settings have not been provided so we will use the default
         * x values for the regression points
         */
        for (var i = 0, len = data.length; i < len; i++) {
          var coordinate = [data[i][0], A + B * Math.log(data[i][0])];
          results.push(coordinate);
        }
      }

      results.sort(function (a, b) {
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
          return -1;
        }
        return 0;
      });

      var string = 'y = ' + Math.round(A * 100) / 100 + ' + ' + Math.round(B * 100) / 100 + ' ln(x)';

      return { equation: [A, B], points: results, string: string };
    }

    /**
     * Code extracted from https://github.com/Tom-Alexander/regression-js/
     */

  }, {
    key: '_power',
    value: function _power(data) {
      var sum = [0, 0, 0, 0],
          n = 0,
          results = [];

      for (len = data.length; n < len; n++) {
        if (data[n]['x']) {
          data[n][0] = data[n]['x'];
          data[n][1] = data[n]['y'];
        }
        if (data[n][1]) {
          sum[0] += Math.log(data[n][0]);
          sum[1] += Math.log(data[n][1]) * Math.log(data[n][0]);
          sum[2] += Math.log(data[n][1]);
          sum[3] += Math.pow(Math.log(data[n][0]), 2);
        }
      }

      var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
      var A = Math.pow(Math.E, (sum[2] - B * sum[0]) / n);

      for (var i = 0, len = data.length; i < len; i++) {
        var coordinate = [data[i][0], A * Math.pow(data[i][0], B)];
        results.push(coordinate);
      }

      results.sort(function (a, b) {
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
          return -1;
        }
        return 0;
      });

      var string = 'y = ' + Math.round(A * 100) / 100 + 'x^' + Math.round(B * 100) / 100;

      return { equation: [A, B], points: results, string: string };
    }

    /**
     * Code extracted from https://github.com/Tom-Alexander/regression-js/
     */

  }, {
    key: '_polynomial',
    value: function _polynomial(data, order, regressionSettings) {
      if (typeof order == 'undefined') {
        order = 2;
      }
      var lhs = [],
          rhs = [],
          results = [],
          a = 0,
          b = 0,
          i = 0,
          k = order + 1;

      for (; i < k; i++) {
        for (var l = 0, len = data.length; l < len; l++) {
          if (data[l]['x']) {
            data[l][0] = data[l]['x'];
            data[l][1] = data[l]['y'];
          }
          if (data[l][1]) {
            a += Math.pow(data[l][0], i) * data[l][1];
          }
        }
        lhs.push(a), a = 0;
        var c = [];
        for (var j = 0; j < k; j++) {
          for (var l = 0, len = data.length; l < len; l++) {
            if (data[l][1]) {
              b += Math.pow(data[l][0], i + j);
            }
          }
          c.push(b), b = 0;
        }
        rhs.push(c);
      }
      rhs.push(lhs);

      var equation = this.gaussianElimination(rhs, k);

      if (regressionSettings != null && regressionSettings.xMin != null && regressionSettings.xMax != null && regressionSettings.numberOfPoints != null) {

        //regression settings have been provided

        /*
         * get the xMin and xMax so we know over what range to plot
         * regression points for
         */
        var xMin = regressionSettings.xMin;
        var xMax = regressionSettings.xMax;

        //get the number of points that should be plotted on the regression line
        var numberOfPoints = regressionSettings.numberOfPoints;

        //get the distance between the xMin and xMax
        var xSpan = xMax - xMin;

        //calculate the points on the regression line
        for (var i = 0; i < numberOfPoints; i++) {
          var x = xMin + xSpan * (i / numberOfPoints);
          var answer = 0;
          for (var w = 0; w < equation.length; w++) {
            answer += equation[w] * Math.pow(x, w);
          }
          results.push([x, answer]);
        }
      } else {
        /*
         * regression settings have not been provided so we will use the default
         * x values for the regression points
         */
        for (var i = 0, len = data.length; i < len; i++) {
          var answer = 0;
          for (var w = 0; w < equation.length; w++) {
            answer += equation[w] * Math.pow(data[i][0], w);
          }
          results.push([data[i][0], answer]);
        }
      }

      results.sort(function (a, b) {
        if (a[0] > b[0]) {
          return 1;
        }
        if (a[0] < b[0]) {
          return -1;
        }
        return 0;
      });

      var string = 'y = ';

      for (var i = equation.length - 1; i >= 0; i--) {
        if (i > 1) string += Math.round(equation[i] * 100) / 100 + 'x^' + i + ' + ';else if (i == 1) string += Math.round(equation[i] * 100) / 100 + 'x' + ' + ';else string += Math.round(equation[i] * 100) / 100;
      }

      return { equation: equation, points: results, string: string };
    }

    /**
     * @author: Ignacio Vazquez
     * Based on
     * - http://commons.apache.org/proper/commons-math/download_math.cgi LoesInterpolator.java
     * - https://gist.github.com/avibryant/1151823
     */

  }, {
    key: '_loess',
    value: function _loess(data, bandwidth) {
      var bandwidth = bandwidth || 0.25;

      var xval = data.map(function (pair) {
        return pair[0];
      });
      var distinctX = array_unique(xval);
      if (2 / distinctX.length > bandwidth) {
        bandwidth = Math.min(2 / distinctX.length, 1);
        console.warn("updated bandwith to " + bandwidth);
      }

      var yval = data.map(function (pair) {
        return pair[1];
      });

      function array_unique(values) {
        var o = {},
            i,
            l = values.length,
            r = [];
        for (i = 0; i < l; i += 1) {
          o[values[i]] = values[i];
        }for (i in o) {
          r.push(o[i]);
        }return r;
      }

      function tricube(x) {
        var tmp = 1 - x * x * x;
        return tmp * tmp * tmp;
      }

      var res = [];

      var left = 0;
      var right = Math.floor(bandwidth * xval.length) - 1;

      for (var i in xval) {
        var x = xval[i];

        if (i > 0) {
          if (right < xval.length - 1 && xval[right + 1] - xval[i] < xval[i] - xval[left]) {
            left++;
            right++;
          }
        }
        //console.debug("left: "+left  + " right: " + right );
        var edge;
        if (xval[i] - xval[left] > xval[right] - xval[i]) edge = left;else edge = right;
        var denom = Math.abs(1.0 / (xval[edge] - x));
        var sumWeights = 0;
        var sumX = 0,
            sumXSquared = 0,
            sumY = 0,
            sumXY = 0;

        var k = left;
        while (k <= right) {
          var xk = xval[k];
          var yk = yval[k];
          var dist;
          if (k < i) {
            dist = x - xk;
          } else {
            dist = xk - x;
          }
          var w = tricube(dist * denom);
          var xkw = xk * w;
          sumWeights += w;
          sumX += xkw;
          sumXSquared += xk * xkw;
          sumY += yk * w;
          sumXY += yk * xkw;
          k++;
        }

        var meanX = sumX / sumWeights;
        //console.debug(meanX);
        var meanY = sumY / sumWeights;
        var meanXY = sumXY / sumWeights;
        var meanXSquared = sumXSquared / sumWeights;

        var beta;
        if (meanXSquared == meanX * meanX) beta = 0;else beta = (meanXY - meanX * meanY) / (meanXSquared - meanX * meanX);

        var alpha = meanY - beta * meanX;
        res[i] = beta * x + alpha;
      }
      console.debug(res);
      return {
        equation: "",
        points: xval.map(function (x, i) {
          return [x, res[i]];
        }),
        string: ""
      };
    }

    /**
     * Code extracted from https://github.com/Tom-Alexander/regression-js/
     */

  }, {
    key: 'gaussianElimination',
    value: function gaussianElimination(a, o) {
      var i = 0,
          j = 0,
          k = 0,
          maxrow = 0,
          tmp = 0,
          n = a.length - 1,
          x = new Array(o);
      for (i = 0; i < n; i++) {
        maxrow = i;
        for (j = i + 1; j < n; j++) {
          if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow])) maxrow = j;
        }
        for (k = i; k < n + 1; k++) {
          tmp = a[k][i];
          a[k][i] = a[k][maxrow];
          a[k][maxrow] = tmp;
        }
        for (j = i + 1; j < n; j++) {
          for (k = n; k >= i; k--) {
            a[k][j] -= a[k][i] * a[i][j] / a[i][i];
          }
        }
      }
      for (j = n - 1; j >= 0; j--) {
        tmp = 0;
        for (k = j + 1; k < n; k++) {
          tmp += a[k][j] * x[k];
        }x[j] = (a[n][j] - tmp) / a[j][j];
      }
      return x;
    }

    /**
     * @author Ignacio Vazquez
     * See http://en.wikipedia.org/wiki/Coefficient_of_determination for theaorical details
     */

  }, {
    key: 'coefficientOfDetermination',
    value: function coefficientOfDetermination(data, pred) {

      var i = 0;
      var SSE = 0;
      var SSYY = 0;
      var mean = 0;

      // Calc the mean
      for (i = 0; i < data.length; i++) {
        mean += data[i][1] / data.length;
      }

      // Calc the coefficent of determination
      for (i = 0; i < data.length; i++) {
        SSYY += Math.pow(data[i][1] - pred[i][1], 2);
        SSE += Math.pow(data[i][1] - mean, 2);
      }
      return 1 - SSYY / SSE;
    }
  }, {
    key: 'isCompleted',
    value: function isCompleted(component, componentStates, componentEvents, nodeEvents, node) {
      if (this.canEdit(component)) {
        if (this.hasComponentStates(componentStates)) {
          if (this.isSubmitRequired(node, component)) {
            return this.hasSubmitComponentState(componentStates);
          } else {
            var componentState = componentStates[componentStates.length - 1];
            return this.componentStateHasStudentWork(componentState);
          }
        }
      } else {
        return this.UtilService.hasNodeEnteredEvent(nodeEvents);
      }
      return false;
    }
  }, {
    key: 'hasComponentStates',
    value: function hasComponentStates(componentStates) {
      return componentStates != null && componentStates.length > 0;
    }
  }, {
    key: 'isSubmitRequired',
    value: function isSubmitRequired(node, component) {
      return node.showSubmitButton || component.showSubmitButton && !node.showSaveButton;
    }
  }, {
    key: 'hasSubmitComponentState',
    value: function hasSubmitComponentState(componentStates) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = componentStates[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var componentState = _step.value;

          if (componentState.isSubmit && this.componentStateHasStudentWork(componentState)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return false;
    }

    /**
     * Determine if the student can perform any work on this component.
     * @param component The component content.
     * @return Whether the student can perform any work on this component.
     */

  }, {
    key: 'canEdit',
    value: function canEdit(component) {
      var series = component.series;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = series[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var singleSeries = _step2.value;

          if (singleSeries.canEdit) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (this.UtilService.hasImportWorkConnectedComponent(component)) {
        return true;
      }
      return false;
    }
  }, {
    key: 'hasSeriesData',
    value: function hasSeriesData(studentData) {
      var series = studentData.series;
      if (series != null) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = series[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var singleSeries = _step3.value;

            if (singleSeries.data != null && singleSeries.data.length > 0) {
              return true;
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }
      return false;
    }
  }, {
    key: 'hasTrialData',
    value: function hasTrialData(studentData) {
      var trials = studentData.trials;
      if (trials != null) {
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = trials[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var trial = _step4.value;
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
              for (var _iterator5 = trial.series[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var singleSeries = _step5.value;

                var seriesData = singleSeries.data;
                if (seriesData.length > 0) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError5 = true;
              _iteratorError5 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                  _iterator5.return();
                }
              } finally {
                if (_didIteratorError5) {
                  throw _iteratorError5;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }
      }
      return false;
    }
  }, {
    key: 'componentStateHasStudentWork',
    value: function componentStateHasStudentWork(componentState, componentContent) {
      if (componentState != null) {
        var studentData = componentState.studentData;
        if (studentData != null) {
          if (studentData.version == 1) {
            /*
             * this is the old graph student data format where the
             * student data can contain multiple series.
             */
            if (this.anySeriesHasDataPoint(studentData.series)) {
              return true;
            }
          } else {
            /*
             * this is the new graph student data format where the
             * student data can contain multiple trials and each trial
             * can contain multiple series.
             */
            if (this.anyTrialHasDataPoint(studentData.trials)) {
              return true;
            }
          }
        }
        if (this.isStudentChangedAxisLimit(componentState, componentContent)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if the student has changed any of the axis limits
     * @param componentState the component state
     * @param componentContent the component content
     * @return whether the student has changed any of the axis limits
     */

  }, {
    key: 'isStudentChangedAxisLimit',
    value: function isStudentChangedAxisLimit(componentState, componentContent) {
      if (componentState != null && componentState.studentData != null && componentContent != null) {
        if (componentState.studentData.xAxis != null && componentContent.xAxis != null) {
          if (componentState.studentData.xAxis.min != componentContent.xAxis.min) {
            return true;
          } else if (componentState.studentData.xAxis.max != componentContent.xAxis.max) {
            return true;
          }
        }
        if (componentState.studentData.yAxis != null && componentContent.yAxis != null) {
          if (componentState.studentData.yAxis.min != componentContent.yAxis.min) {
            return true;
          } else if (componentState.studentData.yAxis.max != componentContent.yAxis.max) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Check if any of the trials contains a data point
     * @param trials an array of trials
     * @return whether any of the trials contains a data point
     */

  }, {
    key: 'anyTrialHasDataPoint',
    value: function anyTrialHasDataPoint(trials) {
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = trials[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var trial = _step6.value;

          if (this.trialHasDataPoint(trial)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      return false;
    }

    /**
     * Check if a trial has a data point
     * @param trial a trial object which can contain multiple series
     * @return whether the trial contains a data point
     */

  }, {
    key: 'trialHasDataPoint',
    value: function trialHasDataPoint(trial) {
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = trial.series[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var singleSeries = _step7.value;

          if (this.seriesHasDataPoint(singleSeries)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7.return) {
            _iterator7.return();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      return false;
    }

    /**
     * Check if an array of series has any data point
     * @param multipleSeries an array of series
     * @return whether any of the series has a data point
     */

  }, {
    key: 'anySeriesHasDataPoint',
    value: function anySeriesHasDataPoint(multipleSeries) {
      if (multipleSeries != null) {
        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
          for (var _iterator8 = multipleSeries[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var singleSeries = _step8.value;

            if (this.seriesHasDataPoint(singleSeries)) {
              return true;
            }
          }
        } catch (err) {
          _didIteratorError8 = true;
          _iteratorError8 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
              _iterator8.return();
            }
          } finally {
            if (_didIteratorError8) {
              throw _iteratorError8;
            }
          }
        }
      }
      return false;
    }

    /**
     * Check if a series has a data point
     * @param singleSeries a series object
     * @return whether the series object has any data points
     */

  }, {
    key: 'seriesHasDataPoint',
    value: function seriesHasDataPoint(singleSeries) {
      return singleSeries.data.length > 0;
    }

    /**
     * The component state has been rendered in a <component></component> element
     * and now we want to take a snapshot of the work.
     * @param componentState The component state that has been rendered.
     * @return A promise that will return an image object.
     */

  }, {
    key: 'generateImageFromRenderedComponentState',
    value: function generateImageFromRenderedComponentState(componentState) {
      var _this2 = this;

      var deferred = this.$q.defer();
      var componentId = componentState.componentId;
      var highchartsDiv = angular.element('#chart_' + componentId).find('.highcharts-container');
      if (highchartsDiv != null && highchartsDiv.length > 0) {
        highchartsDiv = highchartsDiv[0];
        (0, _html2canvas2.default)(highchartsDiv).then(function (canvas) {
          var base64Image = canvas.toDataURL('image/png');
          var imageObject = _this2.UtilService.getImageObjectFromBase64String(base64Image);
          _this2.StudentAssetService.uploadAsset(imageObject).then(function (asset) {
            deferred.resolve(asset);
          });
        });
      }
      return deferred.promise;
    }
  }]);

  return GraphService;
}(_componentService2.default);

GraphService.$inject = ['$filter', '$q', 'StudentAssetService', 'StudentDataService', 'UtilService'];

exports.default = GraphService;
//# sourceMappingURL=graphService.js.map
