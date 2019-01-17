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

var TableService = function (_ComponentService) {
  _inherits(TableService, _ComponentService);

  function TableService($filter, $q, StudentAssetService, StudentDataService, UtilService) {
    _classCallCheck(this, TableService);

    var _this = _possibleConstructorReturn(this, (TableService.__proto__ || Object.getPrototypeOf(TableService)).call(this, $filter, StudentDataService, UtilService));

    _this.$q = $q;
    _this.StudentAssetService = StudentAssetService;
    return _this;
  }

  _createClass(TableService, [{
    key: 'getComponentTypeLabel',
    value: function getComponentTypeLabel() {
      return this.$translate('table.componentTypeLabel');
    }
  }, {
    key: 'createComponent',
    value: function createComponent() {
      var component = _get(TableService.prototype.__proto__ || Object.getPrototypeOf(TableService.prototype), 'createComponent', this).call(this);
      component.type = 'Table';
      component.globalCellSize = 10;
      component.numRows = 3;
      component.numColumns = 3;
      component.tableData = [[{
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }], [{
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }], [{
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }, {
        'text': '',
        'editable': true,
        'size': null
      }]];

      return component;
    }
  }, {
    key: 'isCompleted',
    value: function isCompleted(component, componentStates, componentEvents, nodeEvents, node) {
      if (!this.componentHasEditableCells(component)) {
        /*
         * The component does not have any editable cells so we will say
         * it is completed.
         */
        return true;
      }
      if (componentStates && componentStates.length) {
        var submitRequired = node.showSubmitButton || component.showSubmitButton && !node.showSaveButton;

        // loop through all the component states
        for (var c = 0, l = componentStates.length; c < l; c++) {

          // the component state
          var componentState = componentStates[c];

          // get the student data from the component state
          var studentData = componentState.studentData;

          if (studentData != null) {
            var tableData = studentData.tableData;

            if (tableData != null) {
              // there is a table data so the component has saved work
              // TODO: check for actual student data from the table (compare to starting state)
              if (submitRequired) {
                // completion requires a submission, so check for isSubmit
                if (componentState.isSubmit) {
                  return true;
                }
              } else {
                return true;
              }
            }
          }
        }
      }

      return false;
    }
  }, {
    key: 'componentHasEditableCells',


    /**
     * Check if a table component has any editable cells.
     * @param component The component content.
     * @return Whether the component has any editable cells.
     */
    value: function componentHasEditableCells(component) {
      if (component != null) {
        var tableData = component.tableData;
        if (tableData != null) {
          for (var r = 0; r < tableData.length; r++) {
            var row = tableData[r];
            if (row != null) {
              for (var c = 0; c < row.length; c++) {
                var cell = row[c];
                if (cell != null) {
                  if (cell.editable === true) {
                    return true;
                  }
                }
              }
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

          // get the table from the student data
          var studentTableData = studentData.tableData;

          // get the table from the component content
          var componentContentTableData = componentContent.tableData;

          if (studentTableData != null) {

            var studentRows = studentTableData;

            // loop through the student rows
            for (var r = 0; r < studentRows.length; r++) {
              var studentRow = studentRows[r];

              if (studentRow != null) {

                // loop through the student columns
                for (var c = 0; c < studentRow.length; c++) {

                  // get cell from the student
                  var studentCell = this.getTableDataCellValue(r, c, studentTableData);

                  // get a cell from the component content
                  var componentContentCell = this.getTableDataCellValue(r, c, componentContentTableData);

                  if (studentCell !== componentContentCell) {
                    /*
                     * the cell values are not the same which means
                     * the student has changed the table
                     */
                    return true;
                  }
                }
              }
            }
          }
        }
      }

      return false;
    }

    /**
     * Get the value of a cell in the table
     * @param x the x coordinate
     * @param y the y coordinate
     * @param table (optional) table data to get the value from. this is used
     * when we want to look up the value in the default authored table
     * @returns the cell value (text or a number)
     */

  }, {
    key: 'getTableDataCellValue',
    value: function getTableDataCellValue(x, y, table) {

      var cellValue = null;

      if (table != null) {

        // get the row we want
        var row = table[y];

        if (row != null) {

          // get the cell we want
          var cell = row[x];

          if (cell != null) {

            // set the value into the cell
            cellValue = cell.text;
          }
        }
      }

      return cellValue;
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
      var tableElement = angular.element('#table_' + componentState.nodeId + '_' + componentState.componentId);
      if (tableElement != null && tableElement.length > 0) {
        tableElement = tableElement[0];
        // convert the table element to a canvas element
        (0, _html2canvas2.default)(tableElement).then(function (canvas) {
          // get the canvas as a base64 string
          var img_b64 = canvas.toDataURL('image/png');

          // get the image object
          var imageObject = _this2.UtilService.getImageObjectFromBase64String(img_b64);

          // add the image to the student assets
          _this2.StudentAssetService.uploadAsset(imageObject).then(function (asset) {
            deferred.resolve(asset);
          });
        });
      }
      return deferred.promise;
    }
  }, {
    key: 'hasRequiredNumberOfFilledRows',
    value: function hasRequiredNumberOfFilledRows(componentState, requiredNumberOfFilledRows, tableHasHeaderRow, requireAllCellsInARowToBeFilled) {
      var rows = componentState.studentData.tableData;
      var firstStudentRow = 0;
      if (tableHasHeaderRow) {
        firstStudentRow = 1;
      }
      var filledRows = 0;
      for (var r = firstStudentRow; r < rows.length; r++) {
        var row = rows[r];
        if (this.isRowFilled(row, requireAllCellsInARowToBeFilled)) {
          filledRows++;
        }
      }
      return filledRows >= requiredNumberOfFilledRows;
    }
  }, {
    key: 'isRowFilled',
    value: function isRowFilled(row, requireAllCellsInARowToBeFilled) {
      if (requireAllCellsInARowToBeFilled) {
        return this.isAllCellsFilledInRow(row);
      } else {
        return this.isAtLeastOneCellFilledInRow(row);
      }
      return false;
    }
  }, {
    key: 'isAllCellsFilledInRow',
    value: function isAllCellsFilledInRow(row) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = row[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var c = _step.value;

          if (c.text == null || c.text == '') {
            return false;
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

      return true;
    }
  }, {
    key: 'isAtLeastOneCellFilledInRow',
    value: function isAtLeastOneCellFilledInRow(row) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = row[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var c = _step2.value;

          if (c.text != null && c.text != '') {
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

      return false;
    }
  }]);

  return TableService;
}(_componentService2.default);

TableService.$inject = ['$filter', '$q', 'StudentAssetService', 'StudentDataService', 'UtilService'];

exports.default = TableService;
//# sourceMappingURL=tableService.js.map
