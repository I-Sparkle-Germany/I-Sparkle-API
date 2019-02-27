class AchievementService {
  constructor(
      $http,
      $q,
      $rootScope,
      ConfigService,
      ProjectService,
      StudentDataService,
      UtilService) {
    this.$http = $http;
    this.$q = $q;
    this.$rootScope = $rootScope;
    this.ConfigService = ConfigService;
    this.ProjectService = ProjectService;
    this.StudentDataService = StudentDataService;
    this.UtilService = UtilService;
    this.achievementsByWorkgroupId = {};  // an object of achievements, where key is workgroupId and value is the array of achievements for the workgroup.

    // whether to print debug output to the console
    this.debug = false;

    this.loadAchievements();
  }

  /**
   * Output the string to the console if debug=true
   * @param str the string to output to the console
   */
  debugOutput(str) {
    if (this.debug) {
      console.log(str);
    }
  }

  /**
   * Retrieves achievements from the server
   */
  retrieveAchievements(workgroupId = null, type = null) {
    if (this.ConfigService.isPreview()) {
      const workgroupId = this.ConfigService.getWorkgroupId();
      this.achievementsByWorkgroupId[workgroupId] = [];
      return Promise.resolve(this.achievementsByWorkgroupId);
    } else {
      const config = {
        method: 'GET',
        url: this.ConfigService.getAchievementsURL(),
        params: {}
      };
      if (workgroupId != null) {
        config.params.workgroupId = workgroupId;
      } else if (this.ConfigService.getMode() !== 'classroomMonitor') {
        config.params.workgroupId = this.ConfigService.getWorkgroupId();
        config.params.periodId = this.ConfigService.getPeriodId();
      }
      if (type != null) {
        config.params.type = type;
      }

      
      return this.$http(config).then((response) => {
        let achievements = response.data;

        if (achievements != null) {
          for (let achievement of achievements) {
            this.addOrUpdateAchievement(achievement);

            if (this.ConfigService.getMode() == 'studentRun') {
              const projectAchievement = this.ProjectService
                  .getAchievementByAchievementId(achievement.achievementId);
              if (projectAchievement != null) {

                /*
                 * set the completed field to true in case we ever
                 * need to easily see which achievements the student
                 * has completed
                 */
                projectAchievement.completed = true;

                if (projectAchievement.deregisterFunction != null) {
                  /*
                   * the student has completed this achievement
                   * so we no longer need to listen for it
                   */
                  projectAchievement.deregisterFunction();
                  this.debugOutput('deregistering ' + projectAchievement.id);
                }
              }
            }
          }

          if (this.ConfigService.getMode() == 'studentRun') {
            /*
             * Loop through all the project achievements and
             * re-evaluate whether the student has completed each.
             * This is to make sure students never get stuck in a
             * state where they did everything required to complete
             * a certain achievement but some error or bug occurred
             * which prevented their student achievement from being
             * saved and then they end up never being able to
             * complete that achievement. We will avoid this
             * situation by re-evaluating all the project
             * achievements each time the student loads the VLE.
             */

            const projectAchievements =
                this.ProjectService.getAchievementItems();
            if (projectAchievements != null) {
              for (let projectAchievement of projectAchievements) {
                if (projectAchievement != null) {

                  if (!this.isAchievementCompleted(projectAchievement.id)) {
                    /*
                     * the student has not completed this project achievement
                     * yet
                     */

                    if (this.checkAchievement(projectAchievement)) {
                      /*
                       * the student has satisfied everything that is
                       * required of the achievement
                       */
                      this.studentCompletedAchievement(projectAchievement);
                    }
                  }
                }
              }
            }
          }
        } else {
          this.achievementsByWorkgroupId = {};
        }

        return this.achievementsByWorkgroupId;
      });
    }
  }

  /**
   * Add Achievement to local bookkeeping
   * @param achievement the Achievement to add or update
   */
  addOrUpdateAchievement(achievement) {
    if (achievement != null) {
      let achievementWorkgroupId = achievement.workgroupId;

      /*
       * initialize the workgroup's array of achievements if it does
       * not exist yet
       */
      if (this.achievementsByWorkgroupId[achievementWorkgroupId] == null) {
        this.achievementsByWorkgroupId[achievementWorkgroupId] = new Array();
      }

      let achievements = this.achievementsByWorkgroupId[achievementWorkgroupId];
      let found = false;

      for (let w = 0; w < achievements.length; w++) {
        let a = achievements[w];

        if (a.achievementId != null && a.achievementId === achievement.achievementId &&
          a.workgroupId != null && a.workgroupId === achievement.workgroupId) {
          /*
           * the achievement 10 character alphanumeric id matches and
           * the workgroup id matches so we will update it
           */
          achievements[w] = achievement;
          found = true;  // remember this so we don't insert later.
          break;
        }
      }

      if (!found) {
        // we did not find the achievement so we will add it to the array
        achievements.push(achievement);
      }
    }
  }

  /**
   * Saves the achievement for the logged-in user
   * @param achievement
   */
  saveAchievementToServer(achievement) {
    if (this.ConfigService.isPreview()) {
      // if we're in preview, don't make any request to the server and resolve
      // the promise right away
      let deferred = this.$q.defer();
      deferred.resolve(achievement);
      return deferred.promise;
    } else {
      let config = {
        method: "POST",
        url: this.ConfigService.getAchievementsURL(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      let params = {
        achievementId: achievement.achievementId,
        workgroupId: achievement.workgroupId,
        type: achievement.type
      };

      if (achievement.id != null) {
        params.id = achievement.id;
      }
      if (achievement.data != null) {
        params.data = angular.toJson(achievement.data);
      }

      config.data = $.param(params);

      return this.$http(config).then((result) => {
        let achievement = result.data;
        if (achievement.data != null) {
          achievement.data = angular.fromJson(achievement.data);
        }
        this.addOrUpdateAchievement(achievement);
        return achievement;
      })
    }
  }

  /**
   * Creates a new achievement object
   * @param type type of achievement ["completion", "milestone", etc]
   * @param achievementId id of achievement in project content
   * @param data other extra information about this achievement
   * @param workgroupId id of workgroup whom this achievement is for
   * @returns newly created achievement object
   */
  createNewAchievement(type, achievementId, data = null, workgroupId = null) {
    if (workgroupId == null) {
      workgroupId = this.ConfigService.getWorkgroupId();
    }
    return {
      id: null,
      type: type,
      achievementId: achievementId,
      workgroupId: workgroupId,
      data: data
    };
  }

  /**
   * Load the achievements by creating listeners for the appropriate events
   */
  loadAchievements() {
    const projectAchievements = this.ProjectService.getAchievements();
    if (projectAchievements != null) {
      if (projectAchievements.isEnabled) {
        const projectAchievementItems = projectAchievements.items;
        if (projectAchievementItems != null) {
          for (let projectAchievement of projectAchievementItems) {
            if (projectAchievement != null) {
              let deregisterFunction = null;

              // create a listener for the achievement
              if (projectAchievement.type === 'milestone' || projectAchievement.type === 'completion') {
                deregisterFunction = this.createNodeCompletedListener(projectAchievement);
              } else if (projectAchievement.type === 'aggregate') {
                deregisterFunction = this.createAggregateAchievementListener(projectAchievement);
              }

              /*
               * set the deregisterFunction into the project
               * achievement so that we can deregister the
               * listener after the student has completed the
               * achievement
               */
              projectAchievement.deregisterFunction = deregisterFunction;
            }
          }
        }
      }
    }
  }

  /**
   * Check if the student has completed the achievement
   * @param achievementId
   * @return whether the student has completed the achievement
   */
  isAchievementCompleted(achievementId) {
    if (achievementId != null) {
      const workgroupId = this.ConfigService.getWorkgroupId();
      const achievements = this.getAchievementsByWorkgroupId(workgroupId);
      if (achievements != null) {
        for (let achievement of achievements) {
          if (achievement != null) {
            if (achievement.achievementId === achievementId) {
              /*
               * we have found the achievement with the matching
               * achievement id which means the student has
               * completed the achievement
               */
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * The student has just completed an achievement
   * @param achievement the achievement the student completed
   */
  studentCompletedAchievement(achievement) {
    if (achievement != null) {
      if (achievement.isVisible) {
        /*
         * this is a visible achievement so we will display a message
         * to the student
         */
        alert(`Congratulations you completed: ${achievement.name}`);
        console.log(`Congratulations you completed: ${achievement.name}`);
      }

      const projectAchievement = this.ProjectService.getAchievementByAchievementId(achievement.id);
      if (projectAchievement != null && projectAchievement.deregisterFunction != null) {
        /*
         * deregister the achievement listener now that the student has
         * completed the achievement
         */
        projectAchievement.deregisterFunction();
        this.debugOutput('deregistering ' + projectAchievement.id);
      }

      /*
       * create a copy of the achievement to make sure we don't cause
       * any referencing problems in the future
       */
      const achievementCopy = this.UtilService.makeCopyOfJSONObject(achievement);

      const workgroupId = this.ConfigService.getWorkgroupId();

      const type = achievementCopy.type;
      const id = achievementCopy.id;
      const data = achievementCopy;
      const newAchievement = this.createNewAchievement(type, id, data, workgroupId);
      const achievements = this.getAchievementsByWorkgroupId(workgroupId);
      achievements.push(newAchievement);

      // save the new achievement to the server
      this.saveAchievementToServer(newAchievement);

      // fire an achievementCompleted event
      this.$rootScope.$broadcast('achievementCompleted', { achievementId: achievementCopy.id });
    }
  }

  /**
   * Create a listener for the node completed achievement
   * @param achievement the achievement to listen for
   * @return the deregister function for the listener
   */
  createNodeCompletedListener(achievement) {
    // save this to a variable so that we can access it in the callback
    const thisAchievementService = this;

    // save the achievement to a variable so that we can access it in the callback
    const thisAchievement = achievement;

    this.debugOutput('registering ' + achievement.id);

    const deregisterFunction = this.$rootScope.$on('nodeCompleted', (event, args) => {
      /*
       * the nodeCompleted event was fired so we will check if this
       * achievement has been completed
       */
      const achievement = thisAchievement;
      if (achievement != null) {
        this.debugOutput('createNodeCompletedListener checking ' + achievement.id + ' completed ' + args.nodeId);
        const id = achievement.id;

        if (!this.isAchievementCompleted(id)) {
          /*
           * the student has not completed this achievement before
           * so we will now check if they have completed it
           */
          // check if the student has completed this node completed achievement
          const completed = this.checkNodeCompletedAchievement(achievement);
          if (completed) {
            thisAchievementService.studentCompletedAchievement(achievement);
          }
        }
      }
    });
    return deregisterFunction;
  }

  /**
   * Check if the student completed a specific achievement
   * @param achievement an achievement
   * @return whether the student completed the achievement
   */
  checkAchievement(achievement) {
    let completed = false;
    if (achievement != null) {
      if (achievement.type === 'milestone' || achievement.type === 'completion') {
        completed = this.checkNodeCompletedAchievement(achievement);
      } else if (achievement.type === 'aggregate') {
        completed = this.checkAggregateAchievement(achievement);
      }
    }
    return completed;
  }

  /**
   * Check if the student completed a node completed achievement
   * @param achievement a node completed achievement
   * @return whether the student completed the node completed achievement
   */
  checkNodeCompletedAchievement(achievement) {
    let completed = false;
    if (achievement != null) {
      const params = achievement.params;
      if (params != null) {
        const nodeIds = params.nodeIds;
        for (let n = 0; n < nodeIds.length; n++) {
          const nodeId = nodeIds[n];
          if (n === 0) {
            // this is the first node id
            completed = this.StudentDataService.isCompleted(nodeId);
          } else {
            /*
             * this is a node id after the first node id so
             * we will use an and conditional
             */
            completed = completed && this.StudentDataService.isCompleted(nodeId);
          }
        }
      }
    }
    return completed;
  }

  /**
   * Create a listener for an aggregate achievement
   * @param achievement the project achievement
   * @return the deregister function for the listener
   */
  createAggregateAchievementListener(achievement) {
    const thisAchievementService = this;
    const thisAchievement = achievement;
    this.debugOutput('registering ' + achievement.id);
    const deregisterFunction = this.$rootScope.$on('achievementCompleted', (event, args) => {
      /*
       * the achievementCompleted event was fired so we will check if this
       * achievement has been completed
       */
      const achievement = thisAchievement;
      if (achievement != null) {
        this.debugOutput('createAggregateAchievementListener checking ' + achievement.id + ' completed ' + args.achievementId);

        const id = achievement.id;
        const achievementId = args.achievementId;

        if (!this.isAchievementCompleted(id)) {
          /*
           * the student has not completed this achievement before
           * so we will now check if they have completed it
           */

          const completed = this.checkAggregateAchievement(achievement);
          if (completed) {
            thisAchievementService.studentCompletedAchievement(achievement);
          }
        }
      }
    });
    return deregisterFunction;
  }

  /**
   * Check if the student completed a aggregate achievement
   * @param achievement an aggregate achievement
   * @return whether the student completed the aggregate achievement
   */
  checkAggregateAchievement(achievement) {
    let completed = false;
    if (achievement != null) {
      const params = achievement.params;
      if (params != null) {
        const achievementIds = params.achievementIds;
        for (let a = 0; a < achievementIds.length; a++) {
          const tempAchievementId = achievementIds[a];
          if (a === 0) {
            // this is the first node id
            completed = this.isAchievementCompleted(tempAchievementId);
          } else {
            /*
             * this is a node id after the first node id so
             * we will use an and conditional
             */
            completed = completed && this.isAchievementCompleted(tempAchievementId);
          }
        }
      }
    }
    return completed;
  }

  /**
   * Get achievements for a workgroup id
   * @param workgroupId the workgroup id
   * @return an array of achievements completed by the workgroup
   */
  getAchievementsByWorkgroupId(workgroupId = null) {
    if (workgroupId == null) {
      workgroupId = this.ConfigService.getWorkgroupId();
    }
    if (this.achievementsByWorkgroupId[workgroupId] == null) {
      /*
       * this workgroup does not have an array of achievements yet so we
       * will make it
       */
      this.achievementsByWorkgroupId[workgroupId] = [];
      return this.achievementsByWorkgroupId[workgroupId];
    } else if (this.achievementsByWorkgroupId[workgroupId] != null) {
      return this.achievementsByWorkgroupId[workgroupId];
    }
    return [];
  }

  /**
   * Get an array of student achievements for a given achievement id
   * @param achievementId a 10 character achievement id
   * @return an array of student achievements. student achievements are
   * created when a workgroup completes an achievement.
   */
  getAchievementsByAchievementId(achievementId) {
    const achievementsByAchievementId = [];
    const workgroupIds = this.ConfigService.getClassmateWorkgroupIds();
    for (let workgroupId of workgroupIds) {
      const achievementsForWorkgroup = this.achievementsByWorkgroupId[workgroupId];
      if (achievementsForWorkgroup != null) {
        for (let a = achievementsForWorkgroup.length - 1; a >= 0; a--) {
          const achievement = achievementsForWorkgroup[a];
          if (achievement != null && achievement.data != null) {
            if (achievement.data.id === achievementId) {
              achievementsByAchievementId.push(achievement);
            }
          }
        }
      }
    }
    return achievementsByAchievementId;
  }

  /**
   * Get a mapping from achievement id to array of student achievements
   * @param achievementId the achievement id
   * @return a mapping from achievement id to array of student achievements
   * student achievements are created when a workgroup completes an achievement.
   */
  getAchievementIdToAchievementsMappings(achievementId) {
    const achievementIdToAchievements = {};
    const projectAchievements = this.ProjectService.getAchievementItems();
    for (let projectAchievement of projectAchievements) {
      if (projectAchievement != null) {
        const studentAchievements =
          this.getAchievementsByAchievementId(projectAchievement.id);
        achievementIdToAchievements[projectAchievement.id] = studentAchievements;
      }
    }
    return achievementIdToAchievements;
  }

  /**
   * Get an achievement id that isn't being used
   * @return an achievement id that isn't being used
   */
  getAvailableAchievementId() {
    let id = null;
    const achievements = this.ProjectService.getAchievementItems();
    while (id == null) {
      id = this.UtilService.generateKey(10);
      for (let achievement of achievements) {
        if (achievement.id === id) {
          /*
           * the id is already being used so we need to find
           * a different one
           */
          id = null;
          break;
        }
      }
    }
    return id;
  }
}

AchievementService.$inject = [
  '$http',
  '$q',
  '$rootScope',
  'ConfigService',
  'ProjectService',
  'StudentDataService',
  'UtilService'
];

export default AchievementService;
