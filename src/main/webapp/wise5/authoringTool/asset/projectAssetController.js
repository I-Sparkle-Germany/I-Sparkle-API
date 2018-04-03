'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ProjectAssetController = function () {
  function ProjectAssetController($filter, $mdDialog, $rootScope, $state, $stateParams, $scope, $timeout, ConfigService, ProjectAssetService, UtilService) {
    var _this = this;

    _classCallCheck(this, ProjectAssetController);

    this.$filter = $filter;
    this.$mdDialog = $mdDialog;
    this.$rootScope = $rootScope;
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.ConfigService = ConfigService;
    this.ProjectAssetService = ProjectAssetService;
    this.UtilService = UtilService;
    this.$translate = this.$filter('translate');

    this.projectId = this.$stateParams.projectId;
    this.projectAssets = ProjectAssetService.projectAssets;
    this.projectAssetTotalSizeMax = ProjectAssetService.projectAssetTotalSizeMax;
    this.projectAssetUsagePercentage = ProjectAssetService.projectAssetUsagePercentage;

    // the amount of space the unused files use
    this.totalUnusedFilesSize = 0;

    /*
     * the amount of space the unused files use as a percentage of the
     * total amount of allowed space for the project
     */
    this.unusedFilesPercentage = 0;

    // whether the asset page is being displayed in a popup
    this.isPopup = false;

    // the project id that opened this popup
    this.projectId = null;

    // the node id that opened this popup
    this.nodeId = null;

    // the component id that opened this popup
    this.componentId = null;

    // the target to put the asset in
    this.target = null;

    // the target object to put the asset in
    this.targetObject = null;

    if (this.$stateParams != null) {
      var stateParams = this.$stateParams;
      if (stateParams.isPopup != null) {
        this.isPopup = true;
      }

      if (stateParams.projectId != null) {
        this.projectId = stateParams.projectId;
      }

      if (stateParams.nodeId != null) {
        this.nodeId = stateParams.nodeId;
      }

      if (stateParams.componentId != null) {
        this.componentId = stateParams.componentId;
      }

      if (stateParams.target != null) {
        this.target = stateParams.target;
      }

      if (stateParams.targetObject != null) {
        this.targetObject = stateParams.targetObject;
      }
    }

    // sort assets alphabetically at the beginning
    this.assetSortBy = 'aToZ';
    this.assetMessage = '';

    this.$scope.$watch(function () {
      return _this.projectAssets;
    }, function () {
      _this.projectAssetUsagePercentage = _this.projectAssets.totalFileSize / _this.projectAssetTotalSizeMax * 100;
      _this.sortAssets(_this.assetSortBy);
    });

    // when the user changes the sort assets by field, also nperform the sort
    this.$scope.$watch(function () {
      return _this.assetSortBy;
    }, function () {
      _this.sortAssets(_this.assetSortBy);
    });

    // calculate whether the assets are used in the project
    this.ProjectAssetService.calculateAssetUsage().then(function (totalUnusedFilesSize) {
      _this.setTotalUnusedFilesSize(totalUnusedFilesSize);
    });
  }

  _createClass(ProjectAssetController, [{
    key: 'sortAssets',
    value: function sortAssets(sortBy) {
      if (sortBy === 'aToZ') {
        this.projectAssets.files.sort(this.sortAssetsAToZ);
      } else if (sortBy === 'zToA') {
        var files = this.projectAssets.files;
        this.projectAssets.files = files.sort(this.sortAssetsAToZ).reverse();
      } else if (sortBy === 'smallToLarge') {
        this.projectAssets.files.sort(this.sortAssetsSmallToLarge);
      } else if (sortBy === 'largeToSmall') {
        var _files = this.projectAssets.files;
        this.projectAssets.files = _files.sort(this.sortAssetsSmallToLarge).reverse();
      }
    }
  }, {
    key: 'sortAssetsAToZ',
    value: function sortAssetsAToZ(a, b) {
      var aFileName = a.fileName.toLowerCase();
      var bFileName = b.fileName.toLowerCase();
      var result = 0;

      if (aFileName < bFileName) {
        result = -1;
      } else if (aFileName > bFileName) {
        result = 1;
      }
      return result;
    }
  }, {
    key: 'sortAssetsSmallToLarge',
    value: function sortAssetsSmallToLarge(a, b) {
      var aFileSize = a.fileSize;
      var bFileSize = b.fileSize;
      var result = 0;

      if (aFileSize < bFileSize) {
        result = -1;
      } else if (aFileSize > bFileSize) {
        result = 1;
      }
      return result;
    }

    /**
     * Delete an asset from the project after confirming with the user
     * @param assetItem the asset to delete
     */

  }, {
    key: 'deleteAsset',
    value: function deleteAsset(assetItem) {
      var _this2 = this;

      var deleteConfirmMessage = this.$translate('areYouSureYouWantToDeleteThisFile') + '\n\n' + assetItem.fileName;
      if (confirm(deleteConfirmMessage)) {
        this.ProjectAssetService.deleteAssetItem(assetItem).then(function (newProjectAssets) {
          _this2.projectAssets = _this2.ProjectAssetService.projectAssets;
          // calculate whether the assets are used in the project
          _this2.ProjectAssetService.calculateAssetUsage().then(function (totalUnusedFilesSize) {
            _this2.setTotalUnusedFilesSize(totalUnusedFilesSize);
          });
        });
      }
    }
  }, {
    key: 'downloadAsset',
    value: function downloadAsset(assetItem) {
      this.ProjectAssetService.downloadAssetItem(assetItem);
    }

    /**
     * The user has chosen an asset to use, so notify listeners
     * @param assetItem the asset the user chose
     */

  }, {
    key: 'chooseAsset',
    value: function chooseAsset(assetItem) {
      var params = {
        "assetItem": assetItem,
        "projectId": this.projectId,
        "nodeId": this.nodeId,
        "componentId": this.componentId,
        "target": this.target,
        "targetObject": this.targetObject
      };
      this.$rootScope.$broadcast('assetSelected', params);
    }
  }, {
    key: 'uploadAssetItems',
    value: function uploadAssetItems(files) {
      var _this3 = this;

      this.ProjectAssetService.uploadAssets(files).then(function (uploadAssetsResults) {
        if (uploadAssetsResults && uploadAssetsResults.length > 0) {
          var uploadedAssetsFilenames = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = uploadAssetsResults[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var uploadAssetsResult = _step.value;

              if (typeof uploadAssetsResult.data === 'string') {
                // there was an error uploading this file, so don't add
              } else {
                uploadedAssetsFilenames.push(uploadAssetsResult.config.file.name);
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

          if (uploadedAssetsFilenames.length > 0) {
            // show which files were uploaded for 7 seconds
            _this3.assetMessage = _this3.$translate('assetUploadSuccessful', { assetFilenames: uploadedAssetsFilenames.join(', ') });
            _this3.$timeout(function () {
              _this3.assetMessage = '';
            }, 7000);
          }
        }
        _this3.projectAssets = _this3.ProjectAssetService.projectAssets;
        // calculate whether the assets are used in the project
        _this3.ProjectAssetService.calculateAssetUsage().then(function (totalUnusedFilesSize) {
          _this3.setTotalUnusedFilesSize(totalUnusedFilesSize);
        });
        if (_this3.nodeId != null && _this3.componentId != null && _this3.target != null) {
          var assetItem = {};
          assetItem.fileName = files[0].name;
          assetItem.fileSize = files[0].size;
          _this3.chooseAsset(assetItem);
        }
      });
    }

    /**
     * Preview an asset in the right panel
     * @param $event The event that caused the asset to be previewed. This will
     * either be a mouseover or click event.
     * @param assetItem the asset item to preview
     */

  }, {
    key: 'previewAsset',
    value: function previewAsset($event, assetItem) {
      if (assetItem != null) {
        this.selectedAssetItem = assetItem;
        var assetFileName = assetItem.fileName;
        var assetsDirectoryPath = this.ConfigService.getProjectAssetsDirectoryPath();

        // set the url of the asset so we can preview it
        this.previewAssetURL = assetsDirectoryPath + '/' + assetFileName;

        // clear these flags
        this.assetIsImage = false;
        this.assetIsVideo = false;

        if (this.UtilService.isImage(assetFileName)) {
          this.assetIsImage = true;
        } else if (this.UtilService.isVideo(assetFileName)) {
          this.assetIsVideo = true;
          $('video').load();
        }
      }
    }

    /**
     * Exits the asset view. If this was opened in a popup, closes the
     * popup and reveal the activity below.
     */

  }, {
    key: 'exit',
    value: function exit() {
      if (this.isPopup) {
        this.$mdDialog.hide();
      } else {
        this.$state.go('root.project', { projectId: this.projectId });
      }
    }

    /**
     * Set the total amount of space the unused files use
     * @param totalUnusedFilesSize the total amount of space the unused files
     * use
     */

  }, {
    key: 'setTotalUnusedFilesSize',
    value: function setTotalUnusedFilesSize(totalUnusedFilesSize) {
      // set the total amount of space the unused files use
      this.totalUnusedFilesSize = totalUnusedFilesSize;

      /*
       * calculate the amount of space the unused files use as a
       * percentage of the total amount of allowed space for the project
       */
      this.unusedFilesPercentage = this.totalUnusedFilesSize / this.projectAssetTotalSizeMax * 100;
    }
  }]);

  return ProjectAssetController;
}();

ProjectAssetController.$inject = ['$filter', '$mdDialog', '$rootScope', '$state', '$stateParams', '$scope', '$timeout', 'ConfigService', 'ProjectAssetService', 'UtilService'];

exports.default = ProjectAssetController;
//# sourceMappingURL=projectAssetController.js.map
