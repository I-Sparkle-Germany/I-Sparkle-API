
View.prototype.loadUserAndClassInfo = function(userAndClassInfoContentObject) {
	this.eventManager.fire('getUserAndClassInfoStarted');
	this.userAndClassInfo = this.parseUserAndClassInfo(userAndClassInfoContentObject);

	this.userAndClassInfoLoaded = true;
	this.eventManager.fire('getUserAndClassInfoCompleted');
};

View.prototype.getUserAndClassInfo = function() {
	return this.userAndClassInfo;
};

View.prototype.createUserAndClassInfo = function(myUserInfo, periods, classmateUserInfos, teacherUserInfo, sharedTeacherUserInfos) {
	return function(myUserInfoParam, periodsParam, classmateUserInfosParam, teacherUserInfoParam, sharedTeacherUserInfosParam) {
		var myUserInfo = myUserInfoParam;
		var periods = periodsParam;
		var classmateUserInfos = classmateUserInfosParam;
		var teacherUserInfo = teacherUserInfoParam;

		var getWorkgroupId = function() {
			if (myUserInfo != null) {
				return myUserInfo.workgroupId;
			}
		};

		var getUsername = function() {
			if (myUserInfo != null) {
				return myUserInfo.username;
			}
		};

		/**
		 * Get the user login by extracting it from the username
		 * field.
		 */
		var getUserLoginName = function() {
			var userLoginName = "";

			//use a regular expression to capture the text between the parens
			var captureLoginRegEx = /.*\((.*)\)/;

			//username will be like "Geoffrey Kwan (GeoffreyKwan)"
			var regExMatch = captureLoginRegEx.exec(myUserInfo.username);

			//check if there was a match
			if(regExMatch != null && regExMatch.length > 1) {
				/*
				 * 0th element is the whole string - "Geoffrey Kwan (GeoffreyKwan)"
				 * 1st element is the capture - "GeoffreyKwan"
				 */
				userLoginName = regExMatch[1];
			}

			//return the user login name
			return userLoginName;
		};

		var getPeriodId = function() {
			return myUserInfo.periodId;
		};

		var getPeriodName = function() {
			return myUserInfo.periodName;
		};

		/**
		 * Get an array of period objects. Each period object contains
		 * the period id and period name.
		 */
		var getPeriods = function() {
			return periods;
		};

		/**
		 * Get the period ids
		 */
        var getPeriodIds = function() {
            var periodIds = [];

            var periods = getPeriods();

            if (periods != null) {

                for (var p = 0; p < periods.length; p++) {
                    var period = periods[p];

                    if (period != null) {
                        var periodId = period.periodId;

                        periodIds.push(periodId);
                    }
                }
            }

            return periodIds;
        };

		var getClassmateUserInfos = function() {
			return classmateUserInfos;
		};

		var getTeacherUserInfo = function() {
			return teacherUserInfo;
		};

		var getSharedTeacherUserInfos = function() {
			return sharedTeacherUserInfos;
		};

		var getUsersInClass = function() {
			var allStudentsArray = new Array();

			var myUserInfoWorkgroupId = null;
			var myUserInfoAdded = false;

			if (myUserInfo != null) {
			    // get my workgroup id
			    myUserInfoWorkgroupId = myUserInfo.workgroupId;
			}

			/*
			 * Loop through all the classmates and add them to the array
			 * of user infos. Insert my user info in the appropriate position
			 * so that the user infos are ordered numerically by workgroup id.
			 */
			for (var i=0; i<classmateUserInfos.length; i++) {
			    var classmateUserInfo = classmateUserInfos[i];

			    if (classmateUserInfo != null) {
			        // get the classmate workgroup id
			        var classmateUserInfoWorkgroupId = classmateUserInfo.workgroupId;

			        /*
			         * check if we've added my user info to the array and
			         * if my workgroup id is less than this classmate
			         */
			        if (!myUserInfoAdded && myUserInfoWorkgroupId < classmateUserInfoWorkgroupId) {
			            /*
			             * my workgroup id is less than that of this classmate
			             * so we will add my userinfo now
			             */
			            allStudentsArray.push(myUserInfo);
			            myUserInfoAdded = true;
			        }

			        // add the classmate user info
			        allStudentsArray.push(classmateUserInfo);
			    }

			}

			if (!myUserInfoAdded) {
			    // we have not add my user info so we will now
			    allStudentsArray.push(myUserInfo);
			}

			return allStudentsArray;
		};

		/**
		 * Get all the classmate workgroup ids. This will not include the
		 * workgroup id of the signed in user.
		 */
		var getClassmateWorkgroupIds = function() {
			var classmateWorkgroupIds = [];

			//loop through all the classmates
			for (var x=0; x<classmateUserInfos.length; x++) {
				//get a classmate
				var classmateUserInfo = classmateUserInfos[x];

				if(classmateUserInfo != null) {
					//get the workgroup id for the classmate
					var workgroupId = classmateUserInfo.workgroupId;

					//add the workgroup id to our array that we will return
					classmateWorkgroupIds.push(workgroupId);
				}
			}
			return classmateWorkgroupIds;
		};

		var getWorkgroupIdsInClass = function() {
			var usersInClass = getUsersInClass();
			var workgroupIdsInClass = [];

			for(var x=0; x<usersInClass.length; x++) {
				var user = usersInClass[x];

				workgroupIdsInClass.push(user.workgroupId);
			}

			return workgroupIdsInClass;
		};

		var getUsernameByUserId = function(userId) {
			//check the current logged in user
			if(userId == getWorkgroupId()) {
				return getUsername();
			}

			//check the class mates
			for(var x=0; x<classmateUserInfos.length; x++) {
				if(userId == classmateUserInfos[x].workgroupId) {
					return classmateUserInfos[x].username;
				}
			}

			//return null if no one was found with the userId
			return null;
		};

		var getClassmateByWorkgroupId = function(workgroupId) {
			for (var i=0; i< classmateUserInfos.length; i++) {
				if (classmateUserInfos[i].workgroupId == workgroupId) {
					return classmateUserInfos[i];
				}
			}
			return null;
		};

		var getClassmateIdsByPeriodId = function(periodId) {
			var classmateIds = "";

			//loop through all the classmates
			for (var i=0; i< classmateUserInfos.length; i++) {
				//make sure the classmate is in the same period
				if(classmateUserInfos[i].periodId == periodId) {
					//add a : if necessary
					if(classmateIds != "") {
						classmateIds += ":";
					}

					//add the workgroup id
					classmateIds += classmateUserInfos[i].workgroupId;
				}
			}
			return classmateIds;
		};

		var getClassmatePeriodNameByWorkgroupId = function(workgroupId) {
			//loop through all the classmates
			for(var x=0; x<classmateUserInfos.length; x++) {
				//get a classmate
				var classmate = classmateUserInfos[x];

				//check if this is the classmate we're looking for
				if(classmate.workgroupId == workgroupId) {
					//return the period name/number
					return classmate.periodName;
				}
			}

			//return null if we did not find the workgroup id in our classmates
			return null;
		};

		/**
		 * Get the period id for a workgroup id
		 * @param the workgroup id
		 * @return the period id or null if we did not find the workgroup id
		 */
		var getClassmatePeriodIdByWorkgroupId = function(workgroupId) {
			//loop through all the classmates
			for(var x=0; x<classmateUserInfos.length; x++) {
				//get a classmate
				var classmate = classmateUserInfos[x];

				//check if this is the classmate we're looking for
				if(classmate.workgroupId == workgroupId) {
					//return the period name id
					return classmate.periodId;
				}
			}

			//return null if we did not find the workgroup id in our classmates
			return null;
		};

		var getTeacherWorkgroupId = function() {
			var workgroupId = null;

			if(teacherUserInfo != null) {
				workgroupId = teacherUserInfo.workgroupId;
			}

			return workgroupId;
		};

		/**
		 * Get the shared teacher workgroup ids in an array
		 * @return an array containing the teacher workgroup ids
		 */
		var getSharedTeacherWorkgroupIds = function() {
			var sharedTeacherWorkgroupIdsArray = [];

			//loop through all the shared teachers
			for(var x=0; x<sharedTeacherUserInfos.length; x++) {
				var sharedTeacherUserInfo = sharedTeacherUserInfos[x];

				sharedTeacherWorkgroupIdsArray.push(sharedTeacherUserInfo.workgroupId);
			}

			return sharedTeacherWorkgroupIdsArray;
		};

		/**
		 * Get the teacher workgroup id and all shared teacher workgroup
		 * ids in an array
		 * @return the teacher and shared teacher workgroup ids in an array
		 */
		var getAllTeacherWorkgroupIds = function() {
			//get the teacher workgroup id
			var teacherWorkgroupId = getTeacherWorkgroupId();

			//get the shared teacher workgroup ids
			var sharedTeacherWorkgroupIds = getSharedTeacherWorkgroupIds();

			//add the teacher workgroup to the array of shared teacher workgroup ids
			sharedTeacherWorkgroupIds.unshift(teacherWorkgroupId);

			return sharedTeacherWorkgroupIds;
		};

		/**
		 * Get all the classmates in the period id
		 * @param the period id. if the period id is null or 'all'
		 * we will get classmates from all the periods
		 * @return the classmates in the period
		 */
		var getClassmatesInPeriodId = function(periodId) {
			var classmates = [];

			//loop through all the classmates
			for (var x=0; x< classmateUserInfos.length; x++) {
				var classmateUserInfo = classmateUserInfos[x];

				if(classmateUserInfo != null) {
					var tempPeriodId = classmateUserInfo.periodId;

					//check if the classmate is in the period
					if(periodId == null || periodId == 'all' || periodId == tempPeriodId) {
						classmates.push(classmateUserInfo);
					}
				}
			}

			return classmates;
		}

		/**
		 * Get all the workgroup ids in a period
		 *
		 * @param periodId the period id or null if we want the workgroup
		 * ids from all periods
		 *
		 * @return the workgroup ids from the period
		 */
		var getClassmateWorkgroupIdsInPeriodId = function(periodId) {
			var workgroupIds = [];

			//loop through all the classmates
			for (var x=0; x< classmateUserInfos.length; x++) {
				var classmateUserInfo = classmateUserInfos[x];

				if(classmateUserInfo != null) {
					var tempPeriodId = classmateUserInfo.periodId;

					//check if the classmate is in the period
					if(periodId == null || periodId == 'all' || periodId == tempPeriodId) {
						//get the workgroup id
						var workgroupId = classmateUserInfo.workgroupId;

						//add the workgroup id to our array
						workgroupIds.push(workgroupId);
					}
				}
			}

			return workgroupIds;
		}

		var getClassmatesInAlphabeticalOrder = function() {

      var sortByUsername = function(a, b) {
          var result = 0;
          if (a.username != null && b.username != null) {
              //get the user names from the vleStates
              var usernameA = a.username.toLowerCase();
              var usernameB = b.username.toLowerCase();

              if(usernameA > usernameB) {
                  //a comes after b
                  result = 1;
              } else if(usernameA < usernameB) {
                  //a comes before b
                  result = -1;
              }
          }
          return result;
      };

      return classmateUserInfos.sort(sortByUsername);
		};

		/**
		 * Get the user ids for this user
		 * @return an array containing the user ids in the workgroup
		 */
		var getUserIds = function() {
			var userIds = null;

			if(myUserInfo != null) {
				userIds = myUserInfo.userIds;
			}

			return userIds;
		};

		/**
		 * Get all the students in a period
		 * @param periodId the period id
		 */
		var getAllStudentsInPeriodId = function(periodId) {
			//get all the classmates. this does not include the currently logged in student
			var allStudentsInPeriod = getClassmatesInPeriodId(periodId);

			//get the period id of the currently logged in student
			var myPeriodId = getPeriodId();

			if(periodId == myPeriodId) {
			    var myWorkgroupId = null;
			    var myUserInfoAdded = false;

			    if (myUserInfo != null) {
			        // get my workgroup id
			        myWorkgroupId = myUserInfo.workgroupId;
			    }

			    if (myWorkgroupId != null) {
		             /*
	                 * loop through all the classmates so we can insert my user
	                 * info in the appropriate position so that all the user
	                 * infos are ordered numerically by workgroup id.
	                 */
	                for (var x = 0; x < allStudentsInPeriod.length; x++) {
	                    // get the classmate user info
	                    var studentInPeriod = allStudentsInPeriod[x];

	                    if (studentInPeriod != null) {
	                        // get the classmate workgroup id
	                        var classmateWorkgroupId = studentInPeriod.workgroupId;

	                        if (classmateWorkgroupId != null) {
	                            /*
	                             * check if my workgroup id is less than the classmate
	                             * workgroup id
	                             */
	                            if (myWorkgroupId < classmateWorkgroupId) {
	                                // insert my user info
	                                allStudentsInPeriod.splice(x, 0, myUserInfo);
	                                myUserInfoAdded = true;
	                                break;
	                            }
	                        }
	                    }
	                }

	                if (!myUserInfoAdded) {
	                    // we have not added my user info so we will now
	                    allStudentsInPeriod.push(myUserInfo);
	                }
			    }
			}

			return allStudentsInPeriod;
		};

		/**
		 * Get the classmates in alphabetical order and then get the workgroup ids
		 * @param periodId (optional) period id
		 * @return an array containing the workgroup ids in alphabetical order based
		 * on the user name
		 */
		var getClassmateWorkgroupIdsInAlphabeticalOrder = function(periodId) {
			var workgroupIds = [];

			//get all the classmates in alphabetical order
			var classmatesInAlphabeticalOrder = getClassmatesInAlphabeticalOrder();

			if(classmatesInAlphabeticalOrder != null) {
				//loop through all the classmates
				for(var x=0; x<classmatesInAlphabeticalOrder.length; x++) {
					//get a classmate
					var classmate = classmatesInAlphabeticalOrder[x];

					if(classmate != null) {
						//get the workgroup id
						var tempWorkgroupId = classmate.workgroupId;
						var tempPeriodId = classmate.periodId;

						if(tempWorkgroupId != null) {
							if(periodId == null || periodId == 'all') {
								//period id was not passed in so we will add all classmates
								workgroupIds.push(tempWorkgroupId);
							} else if(periodId == tempPeriodId) {
								//period id was provided and matches so we will add this classmate
								workgroupIds.push(tempWorkgroupId);
							}
						}
					}
				}
			}

			return workgroupIds;
		}

		/**
		 * Get the previous and next workgroup ids. The order of the workgroup ids
		 * is in user name alphabetical order.
		 * @param workgroupId we will get the previous and next workgroup ids relative
		 * to this workgroup id
		 * @param periodId (optional) we will only look at workgroup ids in the period
		 * if this parameter is provided
		 */
		var getPreviousAndNextWorkgroupIdsInAlphabeticalOrder = function(workgroupId, periodId) {
			var previousAndNextWorkgroupIds = new Object();

			if(workgroupId != null) {
				/*
				 * get the workgroup ids in alphabetical order. only look at workgroup ids
				 * in the period if the period is provided.
				 */
				var workgroupIds = getClassmateWorkgroupIdsInAlphabeticalOrder(periodId);

				//loop through all the workgroup ids
				for(var x=0; x<workgroupIds.length; x++) {
					//get a workgroup id
					var tempWorkgroupId = workgroupIds[x];

					if(workgroupId == tempWorkgroupId) {
						//get the previous workgroup id
						var previousWorkgroupId = workgroupIds[x - 1];

						//get the next workgroup id
						var nextWorkgroupId = workgroupIds[x + 1];

						//add the previous and next workgroup ids to the object that we will return
						previousAndNextWorkgroupIds.previousWorkgroupId = previousWorkgroupId;
						previousAndNextWorkgroupIds.nextWorkgroupId = nextWorkgroupId;
						break;
					}
				}
			}

			return previousAndNextWorkgroupIds;
		}

		/**
		 * Get the student names
		 * @param workgroupId the workgroup id
		 * @return an array containing the student names
		 */
		var getStudentNamesByWorkgroupId = function(workgroupId) {
			var studentNames = [];

			//get the user names for the workgroup e.g. "Spongebob Squarepants (SpongebobS0101):Patrick Star (PatrickS0101)"
			var usernames = getUsernameByUserId(workgroupId);

			if(usernames != null) {
				//split the user names string by ':'
				var usernamesSplit = usernames.split(':');

				if(usernamesSplit != null) {
					//loop through each user name
					for(var x=0; x<usernamesSplit.length; x++) {
						//get a user name e.g. "Spongebob Squarepants (spongebobs0101)"
						var username = usernamesSplit[x];

						//get the index of the open parenthesis
						var indexOfOpenParen = username.indexOf('(');

						//get the student name e.g. "Spongebob Squarepants"
						var studentName = username.substring(0, indexOfOpenParen - 1);

						//add the student name to the array
						studentNames.push(studentName);
					}
				}
			}

			return studentNames;
		}

		/**
		 * Get the student names
		 * @param workgroupId the workgroup id
		 * @return an array containing the student names
		 */
		var getStudentFirstNamesByWorkgroupId = function(workgroupId) {
			var studentNames = [];

			//get the user names for the workgroup e.g. "Spongebob Squarepants (SpongebobS0101):Patrick Star (PatrickS0101)"
			var usernames = getUsernameByUserId(workgroupId);

			if(usernames != null) {
				//split the user names string by ':'
				var usernamesSplit = usernames.split(':');

				if(usernamesSplit != null) {
					//loop through each user name
					for(var x=0; x<usernamesSplit.length; x++) {
						//get a user name e.g. "Spongebob Squarepants (spongebobs0101)"
						var username = usernamesSplit[x];

						//get the index of the first empty space
						var indexOfSpace = username.indexOf(' ');

						//get the student first name e.g. "Spongebob"
						var studentFirstName = username.substring(0, indexOfSpace);

						//add the student name to the array
						studentNames.push(studentFirstName);
					}
				}
			}

			return studentNames;
		}

		/**
		 * Get the first name of the nth student.
		 * first student n = 1
		 * second student n = 2
		 * third student n = 3
		 * @param workgroupId the workgroup id
		 * @return the first name of the nth student
		 */
		var getFirstNameOfNthStudentByWorkgroupId = function(workgroupId, n) {
			var firstName = "First Name";

			//get the user names for the workgroup e.g. "Spongebob Squarepants (SpongebobS0101):Patrick Star (PatrickS0101)"
			var usernames = getUsernameByUserId(workgroupId);

			if(usernames != null) {
				//split the user names string by ':'
				var usernamesSplit = usernames.split(':');

				if(usernamesSplit != null) {

					if (n > usernamesSplit.length) {
						/*
						 * if n is greater than the number of students in the
						 * workgroup, we will just use the last student
						 */
						n = usernamesSplit.length;
					}

					if (n != null && n > 0) {
						//get a user name e.g. "Spongebob Squarepants (spongebobs0101)"
						var username = usernamesSplit[n - 1];

						//get the index of the first empty space
						var indexOfSpace = username.indexOf(' ');

						//get the student first name e.g. "Spongebob"
						firstName = username.substring(0, indexOfSpace);
					}
				}
			}

			return firstName;
		}

		/**
		 * Get the first name of the first student in the workgroup
		 * @param workgroupId the workgroup id
		 * @return the first name of the first student in the workgroup
		 */
		var getFirstNameOfFirstStudentByWorkgroupId = function(workgroupId) {
			return getFirstNameOfNthStudentByWorkgroupId(workgroupId, 1);
		}

		/**
		 * Get the first name of the second student in the workgroup
		 * @param workgroupId the workgroup id
		 * @return the first name of the second student in the workgroup
		 */
		var getFirstNameOfSecondStudentByWorkgroupId = function(workgroupId) {
			return getFirstNameOfNthStudentByWorkgroupId(workgroupId, 2);
		}

		/**
		 * Get the first name of the third student in the workgroup
		 * @param workgroupId the workgroup id
		 * @return the first name of the third student in the workgroup
		 */
		var getFirstNameOfThirdStudentByWorkgroupId = function(workgroupId) {
			return getFirstNameOfNthStudentByWorkgroupId(workgroupId, 3);
		}

        /**
         * Get the WISE ids for a workgroup
         * @param workgroupId the workgroup id
         * @returns an array containing the WISE ids of the users in the workgroup
         */
        var getWISEIdsByWorkgroupId = function(workgroupId) {
            var wiseIds = [];

            if(workgroupId == getWorkgroupId()) {
                // the signed in user is in the workgroup we are looking for

                // get the WISE ids of the signed in workgroup
                wiseIds = getUserIds()
            } else {
                // the workgroup we are looking for is a classmate workgroup
                var classmate = getClassmateByWorkgroupId(workgroupId);

                if (classmate != null) {
                    // get the WISE ids of the classmate workgroup
                    wiseIds = classmate.userIds;
                }
            }

            return wiseIds;
        }

        var isLoggedInUserSwitchedUser = function() {
            if (myUserInfo != null) {
                return myUserInfo.isSwitchedUser;
            }
        };

		return {
			getWorkgroupId:function() {
				return getWorkgroupId();
			},
			getUsername:function() {
				return getUsername();
			},
			getPeriodId:function() {
				return getPeriodId();
			},
			getPeriodName:function() {
				return getPeriodName();
			},
			getUsersInClass:function() {
				return getUsersInClass();
			},
			getUsernameByUserId:function(userId) {
				return getUsernameByUserId(userId);
			},
			getClassmateByWorkgroupId:function(workgroupId) {
				return getClassmateByWorkgroupId(workgroupId);
			},
			getClassmateIdsByPeriodId:function(periodId) {
				return getClassmateIdsByPeriodId(periodId);
			},
			getClassmatePeriodNameByWorkgroupId:function(workgroupId) {
				return getClassmatePeriodNameByWorkgroupId(workgroupId);
			},
			getClassmatePeriodIdByWorkgroupId:function(workgroupId) {
				return getClassmatePeriodIdByWorkgroupId(workgroupId);
			},
			getTeacherWorkgroupId:function() {
				return getTeacherWorkgroupId();
			},
			getClassmatesInAlphabeticalOrder:function() {
				return getClassmatesInAlphabeticalOrder();
			},
			getWorkgroupIdsInClass:function() {
				return getWorkgroupIdsInClass();
			},
			getClassmateUserInfos:function() {
				return getClassmateUserInfos();
			},
			getTeacherUserInfo:function() {
				return getTeacherUserInfo();
			},
			getSharedTeacherUserInfos:function() {
				return getSharedTeacherUserInfos();
			},
			getSharedTeacherWorkgroupIds:function() {
				return getSharedTeacherWorkgroupIds();
			},
			getAllTeacherWorkgroupIds:function() {
				return getAllTeacherWorkgroupIds();
			},
			getUserLoginName:function() {
				return getUserLoginName();
			},
			getClassmateWorkgroupIds:function() {
				return getClassmateWorkgroupIds();
			},
            getPeriods:function() {
                return getPeriods();
            },
            getPeriodIds:function() {
                return getPeriodIds();
            },
			getClassmatesInPeriodId:function(periodId) {
				return getClassmatesInPeriodId(periodId);
			},
			getUserIds:function() {
				return getUserIds();
			},
			getAllStudentsInPeriodId:function(periodId) {
				return getAllStudentsInPeriodId(periodId);
			},
			getClassmateWorkgroupIdsInPeriodId:function(periodId) {
				return getClassmateWorkgroupIdsInPeriodId(periodId);
			},
			getClassmateWorkgroupIdsInAlphabeticalOrder:function(periodId) {
				return getClassmateWorkgroupIdsInAlphabeticalOrder(periodId);
			},
			getPreviousAndNextWorkgroupIdsInAlphabeticalOrder:function(workgroupId, periodId) {
				return getPreviousAndNextWorkgroupIdsInAlphabeticalOrder(workgroupId, periodId);
			},
			getStudentNamesByWorkgroupId:function(workgroupId) {
				return getStudentNamesByWorkgroupId(workgroupId);
			},
			getStudentFirstNamesByWorkgroupId:function(workgroupId) {
				return getStudentFirstNamesByWorkgroupId(workgroupId);
			},
			getFirstNameOfFirstStudentByWorkgroupId:function(workgroupId) {
				return getFirstNameOfFirstStudentByWorkgroupId(workgroupId);
			},
			getFirstNameOfSecondStudentByWorkgroupId:function(workgroupId) {
				return getFirstNameOfSecondStudentByWorkgroupId(workgroupId);
			},
			getFirstNameOfThirdStudentByWorkgroupId:function(workgroupId) {
				return getFirstNameOfThirdStudentByWorkgroupId(workgroupId);
			},
            getWISEIdsByWorkgroupId:function(workgroupId) {
                return getWISEIdsByWorkgroupId(workgroupId);
            },
            isLoggedInUserSwitchedUser:function() {
			    return isLoggedInUserSwitchedUser();
            }
		};
	}(myUserInfo, periods, classmateUserInfos, teacherUserInfo, sharedTeacherUserInfos);
};

View.prototype.parseUserAndClassInfo = function(contentObject) {
	var contentObjectJSON = null;
	if (contentObject != null) {
		contentObjectJSON = contentObject.getContentJSON();
	} else {
		contentObjectJSON = {};
		contentObjectJSON.myUserInfo = {};

		// set the preview user name
		contentObjectJSON.myUserInfo.username = "PreviewUser One (PreviewUserO0101)";

		// try to get the workgroup id that may have been passed in as a url param
		var workgroupId = this.config.getConfigParam('workgroupId');

		if (workgroupId == null || workgroupId === '') {
			// generate a random workgroup id for this preview user
			workgroupId = Math.floor(Math.random() * 100000);
		}

		contentObjectJSON.myUserInfo.workgroupId = workgroupId

	}
	var classInfoJSON;
	var myUserInfo;
	var periods;
	var classmateUserInfos;
	var teacherUserInfo;
	var sharedTeacherUserInfos;

	if(contentObjectJSON.myUserInfo != null) {
		classInfoJSON = contentObjectJSON.myUserInfo.myClassInfo;
		myUserInfo = contentObjectJSON.myUserInfo;

		if(classInfoJSON != null) {
			if(classInfoJSON.periods != null) {
				periods = classInfoJSON.periods;
			}

			if(classInfoJSON.classmateUserInfos != null) {
				classmateUserInfos = classInfoJSON.classmateUserInfos;
			}

			if(classInfoJSON.teacherUserInfo != null) {
				teacherUserInfo = classInfoJSON.teacherUserInfo;
			}

			if(classInfoJSON.sharedTeacherUserInfos != null) {
				sharedTeacherUserInfos = classInfoJSON.sharedTeacherUserInfos;
			}
		}
	}

	return this.createUserAndClassInfo(myUserInfo, periods, classmateUserInfos, teacherUserInfo, sharedTeacherUserInfos);
};


//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/model/userandclassinfo.js');
};
