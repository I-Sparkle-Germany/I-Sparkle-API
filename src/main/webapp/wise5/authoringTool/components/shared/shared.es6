'use strict';

import MainMenu from './mainMenu/mainMenu';
import SideMenu from './sideMenu/sideMenu';
import StepTools from './stepTools/stepTools';
import Toolbar from './toolbar/toolbar';
import TopBar from './topBar/topBar';

const SharedComponents = angular.module('sharedComponents', [])
    .component('mainMenu', MainMenu)
    .component('sideMenu', SideMenu)
    .component('stepTools', StepTools)
    .component('toolbar', Toolbar)
    .component('topBar', TopBar);

export default SharedComponents;
