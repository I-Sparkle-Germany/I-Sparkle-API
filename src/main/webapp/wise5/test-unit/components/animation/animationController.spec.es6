import angular from 'angular';
import mainModule from 'vle/main';
import 'angular-mocks';

describe('AnimationController', () => {

  let $controller;
  let $rootScope;
  let $scope;
  let animationController;
  let component;

  beforeEach(angular.mock.module(mainModule.name));

  beforeEach(inject((_$controller_, _$rootScope_) => {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    component = {
      "id": "wr7kg5wwuy",
      "type": "Animation",
      "prompt": "",
      "showSaveButton": false,
      "showSubmitButton": false,
      "widthInPixels": 600,
      "widthInUnits": 60,
      "heightInPixels": 200,
      "heightInUnits": 20,
      "dataXOriginInPixels": 0,
      "dataYOriginInPixels": 80,
      "coordinateSystem": "screen",
      "objects": [
        {
          "id": "2uiqxlkvcc",
          "type": "image",
          "data": [
            {
              "t": 0,
              "x": 0
            },
            {
              "t": 10,
              "x": 50
            },
            {
              "t": 20,
              "x": 0
            }
          ],
          "image": "Swimmer.png",
          "dataX": 0,
          "dataY": 0
        }
      ],
      "showAddToNotebookButton": true,
      "connectedComponents": []
    };
    $scope = $rootScope.$new();
    $scope.componentContent = JSON.parse(JSON.stringify(component));

    animationController = $controller('AnimationController', { $scope: $scope });
    animationController.nodeId = 'node1';
  }));

  it('should convert data x to pixel x', () => {
    const pixelX = animationController.dataXToPixelX(10);
    expect(pixelX).toEqual(100);
  });

  it('should convert data y to pixel y', () => {
    const pixelY = animationController.dataYToPixelY(0);
    expect(pixelY).toEqual(80);
  });

});
