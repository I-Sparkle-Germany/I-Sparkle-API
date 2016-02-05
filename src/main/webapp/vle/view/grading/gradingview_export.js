View.prototype.exportButtonClickedEventListener = function(exportType, fileType) {
	this.setParamsForXLSExport();
	$('#exportType').val(exportType);
	$('#fileType').val(fileType);

	if (exportType == 'customLatestStudentWork') {
		//get all the node ids that were chosen for the custom export
		var customStepsArrayJSONString = this.getCustomStepsArrayJSONString();
		$('#customStepsArray').val(customStepsArrayJSONString);
	} else if (exportType == 'customAllStudentWork') {
		//get all the node ids that were chosen for the custom export
		var customStepsArrayJSONString = this.getCustomStepsArrayJSONString();
		$('#customStepsArray').val(customStepsArrayJSONString);
	}

	$('#getStudentXLSExport').submit();
};

/**
 * Request a special export
 * @param nodeId the node id for the step we will special export
 */
View.prototype.specialExportButtonClickedEventListener = function(nodeId) {
	this.setParamsForSpecialExport();
	$('#exportType').val('specialExport');

	//set the node id
	$('#nodeId').val(nodeId);

	$('#getStudentXLSExport').submit();
};

/**
 * Request a special export
 * @param nodeId the node id for the step we will special export
 */
View.prototype.specialExportCSVButtonClickedEventListener = function(nodeId) {

    // retrieve the student work for the node from the server
	this.specialExportGetWorkForNodeId(nodeId);
};

/**
 * Get the work for the step
 *
 * @param nodeId the node id
 */
View.prototype.specialExportGetWorkForNodeId = function(nodeId) {
	//get the url for retrieving student data
	var studentDataURL = this.getConfig().getConfigParam('studentDataURL');

	var runId = this.getConfig().getConfigParam('runId');
	var grading = true;
	var getRevisions = false;

	//get the workgroup ids in the run
	var workgroupIds = this.getUserAndClassInfo().getClassmateWorkgroupIds();

	//join the workgroup ids into a single string delimited by ':'
	userIds = workgroupIds.join(':');

	//create the GET params for retrieving the student data
	var studentDataURLWithParams = studentDataURL +
		"?nodeIds=" + nodeId +
		"&userId=" + userIds +
		"&grading=true" +
		"&runId=" + runId +
		"&getRevisions=" + getRevisions +
		"&useCachedWork=false";

	//make the request to retrieve the student data
	this.connectionManager.request('GET', 1, studentDataURLWithParams, null, this.specialExportGetWorkForNodeIdCallback, [this, nodeId], this.specialExportGetWorkForNodeIdCallbackFail);

};

/**
 * The success callback when retrieving the student work for a step
 *
 * @param text the response text
 * @param xml
 * @param args
 */
View.prototype.specialExportGetWorkForNodeIdCallback = function(text, xml, args) {
	var thisView = args[0];
	var nodeId = args[1];

	//get the student work and then display the grade by step grading page
	thisView.specialExportGetWorkForNodeIdCallbackHandler(text, nodeId);
};

/**
 * Called when we successfully retrieve the student work for a step
 *
 * @param text the student work from the step as a string. this will contain
 * an array of vle states that have node visits only from the specific
 * step we are looking at
 * @param nodeId the node id for the step
 */
View.prototype.specialExportGetWorkForNodeIdCallbackHandler = function(text, nodeId) {
	//parse the text into JSON, this will be an object which contains an array of vle states
	var vleStatesForNodeId = JSON.parse(text);

	if(vleStatesForNodeId != null) {
		//the array to hold all the vle states
		var workForNodeId = [];

		//get the vle states array
		var vleStates = vleStatesForNodeId.vleStates;

		//loop through all the vle states JSON objects
		for(var x=0; x<vleStates.length; x++) {
			//get a vle state JSON object
			var vleStateJSONObj = vleStates[x];

			//create a vle state object
			var vleState = VLE_STATE.prototype.parseDataJSONObj(vleStateJSONObj);

			//add the vle state object to the array
			workForNodeId.push(vleState);
		}

		//set the array of vle states for this step
		this.model.setWorkByNodeId(nodeId, workForNodeId);

        if (this.getProject().getNodeById(nodeId).type === 'TableNode') {
            // generate the special export csv
            this.generateTableSpecialExportCSV(nodeId);
        }
	}
};

/**
 * The failure callback when trying to retrieve student work
 */
View.prototype.specialExportGetWorkForNodeIdCallbackFail = function(text, xml, args) {
	var thisView = args;
};

/**
 * Generate the special export csv for the table step
 * @param nodeId the node id
 */
View.prototype.generateTableSpecialExportCSV = function(nodeId) {

	var rows = [];
	var runId = this.getConfig().getConfigParam('runId');
	var stepNumberAndTitle = this.getProject().getStepNumberAndTitle(nodeId);
    var teacherUserName = this.userAndClassInfo.getTeacherUserInfo().userName;
    var projectId = this.config.getConfigParam('projectId');
    var parentProjectId = this.config.getConfigParam('parentProjectId');
    var projectName = this.getProject().getTitle();
    var nodeType = this.getProject().getNodeById(nodeId).type;

    /*
     * remove the Node part of the node type for example
     * TableNode will be changed to Table
     */
    nodeType = nodeType.replace('Node', '');

	var workgroupIds = this.userAndClassInfo.getWorkgroupIdsInClass();

	var maxRows = 0;
	var maxColumns = 0;

    /*
     * loop through all the workgroups to find the max number of
     * rows and columns that any student has used
     */
	for (var w = 0; w < workgroupIds.length; w++) {

		var workgroupId = workgroupIds[w];

		var nodeVisits = this.model.getNodeVisitsByNodeIdAndWorkgroupId(nodeId, workgroupId);

		if (nodeVisits != null && nodeVisits.length > 0) {

			// get the latest node visit
			var nodeVisit = nodeVisits[nodeVisits.length - 1];

			var nodeStates = nodeVisit.nodeStates;

			if (nodeStates != null && nodeStates.length > 0) {

                // get the latest node state
				var nodeState = nodeStates[nodeStates.length - 1];

				var tableData = nodeState.tableData;

				if (tableData != null) {
					var numRows = 0;

                    // get the number of columns in this student table
					var numColumns = tableData.length;

					if (numColumns > 0) {
                        // get the number of rows in this student table
						numRows = tableData[0].length;
					}

                    /*
                     * update the max values if we have found a larger value
                     * than what we have previously seen
                     */

					if (numRows > maxRows) {
						maxRows = numRows;
					}

					if (numColumns > maxColumns) {
						maxColumns = numColumns;
					}
				}
			}
		}
	}

    // add the metadata cells in the header row
	var headerRow = [
		'Workgroup Id',
		'WISE Id 1',
		'WISE Id 2',
		'WISE Id 3',
		'Class Period',
		'Teacher Login',
		'Project Id',
		'Parent Project Id',
		'Project Name',
        'Run Id',
        'Step Work Id',
        'Step Title',
        'Step Type'
	];

    // add the table cell labels in the header row
	for (var y = 0; y < maxRows; y++) {
		for (var x = 0; x < maxColumns; x++) {
			headerRow.push('Row ' + (y + 1) + ' Column ' + (x + 1));
		}
	}

    // add the header row to our rows
	rows.push(headerRow);

    // loop through all the workgroups to obtain the student data
	for (var w = 0; w < workgroupIds.length; w++) {

		var workgroupId = workgroupIds[w];
		var classmate = this.userAndClassInfo.getClassmateByWorkgroupId(workgroupId);

		if (classmate != null) {
			var row = [];

            // add the workgroup id cell
			row.push(workgroupId);

            // add the wise id cells
            var wiseIds = classmate.userIds;
			for (var wi = 0; wi < wiseIds.length; wi++) {
				var wiseId = wiseIds[wi];

				row.push(wiseId);
			}

            // add any necessary empty cells for wise ids (if the workgroup has less than 3 members)
			var numEmptyWISEIdColumns = 3 - wiseIds.length;
            if (numEmptyWISEIdColumns > 0) {
                for (var e = 0; e < numEmptyWISEIdColumns; e++) {
                    row.push("");
                }
            }

            // add the period name
			var periodName = classmate.periodName;
			row.push(periodName);

            // add the teacher name
			row.push(teacherUserName);

            // add the project id
			row.push(projectId);

            // add the parent project id
			row.push(parentProjectId);

            // add the project name
			row.push(projectName);

            // add the run id
			row.push(runId);

			//row.push(''); // start date
			//row.push(''); // end date

            // get all the node visits for this student for the step
			var nodeVisits = this.model.getNodeVisitsByNodeIdAndWorkgroupId(nodeId, workgroupId);

			if (nodeVisits != null && nodeVisits.length > 0) {

				// get the latest node visit
				var nodeVisit = nodeVisits[nodeVisits.length - 1];

                // add the step work id
                var stepWorkId = parseInt(nodeVisit.id);
                row.push(stepWorkId);

                // add the step number and title
                row.push(stepNumberAndTitle);

                // add the node type
                row.push(nodeType);

				var nodeStates = nodeVisit.nodeStates;

				if (nodeStates != null && nodeStates.length > 0) {

                    // get the latest node state
					var nodeState = nodeStates[nodeStates.length - 1];

                    if (nodeState != null) {
                        // get the table data
                        var tableData = nodeState.tableData;

                        // loop through the rows
                        for (var y = 0; y < maxRows; y++) {

                            // loop through the columns
                            for (var x = 0; x < maxColumns; x++) {
                                var value = Table.prototype.getCellValue(x, y, tableData);

                                if (value != null) {
                                    if (typeof value == 'string' && value.indexOf(',') != -1) {
                                        // wrap the value in quotes if it contains a comma
                                        row.push('"' + value + '"');
                                    } else {
                                        // add the value into the cell
                                        row.push(value);
                                    }
                                } else {
                                    //this student does not have a cell for this table position
                                    row.push('');
                                }
                            }
                        }
                    }
				}
			}

            // add the workgroup's row
			rows.push(row);
		}
	}

    // get the csv string
    var csvString = this.convertToCSVString(rows);

    // get the file name
    var fileName = 'Run_' + runId + '_Step_' + stepNumberAndTitle + '.csv';

    // download the csv file
    this.downloadCSV(fileName, csvString);
};

/**
 * Convert the rows into a csv string
 * @param rows an array of arrays that contain values that represent
 * the cells that will show up in the csv
 */
View.prototype.convertToCSVString = function(rows) {
	var csvRows = [];

    // loop through all the rows
	for (var r = 0; r < rows.length; r++) {
		var row = rows[r];

        // join all the cells in the row with a comma
		csvRows.push(row.join(","));
	}

    // joine all the rows with a new line
	var csvString = csvRows.join("\n");

	return csvString;
};

/**
 * Download the csv file
 * @param fileName the file name
 * @param csvString the csv string
 */
View.prototype.downloadCSV = function(fileName, csvString) {

    // change all spaces in the filename to underscores
    fileName = fileName.replace(/ /g, '_');

    // create an anchor that will be used to download the csv file
    var a = document.createElement('a');
    a.href = 'data:attachment/csv,' + encodeURIComponent(csvString);
    a.target = '_blank';
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Request the student names export
 */
View.prototype.getStudentNamesExport = function() {
	var getStudentListURL = this.getConfig().getConfigParam("getStudentListURL");

	document.getElementById('runId').value = this.getConfig().getConfigParam('runId');
	document.getElementById('getStudentXLSExport').action = getStudentListURL;

	$('#getStudentXLSExport').submit();
};

/**
 * Get the custom steps array JSON string
 * @return a JSON string that contains all the custom node ids
 */
View.prototype.getCustomStepsArrayJSONString = function() {
	var customStepsJSONString = "";
	var customStepsArray = this.getCustomStepsArray();

	if (customStepsArray != null) {
		customStepsJSONString = JSON.stringify(customStepsArray);
	}

	return customStepsJSONString;
};

/**
 * Get the custom steps array
 * @return and array of node id strings
 */
View.prototype.getCustomStepsArray = function() {
	var customStepsArray = [];

	//get all the steps that were checked
	var customSteps = $("input:checkbox[name='customExportStepCheckbox']:checked");

	//loop through all the steps
	for (var x=0; x<customSteps.length; x++) {
		var customStep = customSteps[x];

		if (customStep != null) {
			//get the node id of the step
			var nodeId = customStep.value;

			if (nodeId != null) {
				//add the node id to our array
				customStepsArray.push(nodeId);
			}
		}
	}

	return customStepsArray;
};

/**
 * Generate the nodeIdToNodeTitleArray which is used for
 * XLS export to display the node titles in the XLS. This
 * is a recursive function that modifies the global array
 * this.nodeIdToNodeTitleArray
 * @param node this should be the root node of the project
 */
View.prototype.getNodeIdToNodeTitlesMap = function(node) {
	var displayGradeByStepSelectPageHtml = "";

	if (node.isLeafNode()) {
		//this node is a leaf/step

		/*
		 * create the mapping of node id to node title delimited by &##58;
		 * &#58; is the ascii value of : and we use two #'s in case the
		 * author used a : in the step title to prevent collisions and
		 * corruption when parsing this after this string is sent
		 * back to the server
		 * e.g. node_1.html&##58;1. Introduction
		 */
		var nodeIdToNodeTitle = node.id + "###58;" + this.getProject().getVLEPositionById(node.id) + " " + node.title;

		/*
		 * add the mapping to the array that we are using to keep track
		 * of all the mappings. replace all commas , with &##44;
		 * &#44; is the ascii value of , and we use two #'s to prevent
		 * collisions and parsing errors
		 */
		this.nodeIdToNodeTitleArray.push(nodeIdToNodeTitle.replace(/,/g, "###44;"));
	} else {
		//loop through all its children
		for (var x=0; x<node.children.length; x++) {
			//call this function with each child
			this.getNodeIdToNodeTitlesMap(node.children[x]);
		}
	}
};

/**
 * Sets all the parameters that are required for the XLS
 * export.
 */
View.prototype.setParamsForXLSExport = function() {

	/*
	 * set the run id to an element that will be passed back to the server
	 * when the export to xls is called
	 */
	document.getElementById('runId').value = this.getConfig().getConfigParam('runId');

	//set the project id
	document.getElementById('projectId').value = this.getConfig().getConfigParam('projectId');

	//set the parent project id
	document.getElementById('parentProjectId').value = this.getConfig().getConfigParam('parentProjectId');

	//set the run name
	document.getElementById('runName').value = this.getConfig().getConfigParam('runName');

	/*
	 * set the project title to an element that will be passed back to the server
	 */
	document.getElementById('projectName').value = this.getProject().getTitle();

	/*
	 * set the type for the bridge controller to inspect
	 */
	document.getElementById('type').value = "xlsexport";

	/*
	 * set the url for where to get the xls
	 */
	document.getElementById('getStudentXLSExport').action = this.getConfig().getConfigParam('getXLSExportURL');
};

/**
 * Sets all the parameters that are required for the special export.
 */
View.prototype.setParamsForSpecialExport = function() {

	/*
	 * set the run id to an element that will be passed back to the server
	 * when the export to xls is called
	 */
	document.getElementById('runId').value = this.getConfig().getConfigParam('runId');

	//set the project id
	document.getElementById('projectId').value = this.getConfig().getConfigParam('projectId');

	//set the parent project id
	document.getElementById('parentProjectId').value = this.getConfig().getConfigParam('parentProjectId');

	//set the run name
	document.getElementById('runName').value = this.getConfig().getConfigParam('runName');

	/*
	 * set the project title to an element that will be passed back to the server
	 */
	document.getElementById('projectName').value = this.getProject().getTitle();

	/*
	 * set the type for the bridge controller to inspect
	 */
	document.getElementById('type').value = "specialExport";

	/*
	 * set the url for where to get the xls
	 */
	document.getElementById('getStudentXLSExport').action = this.getConfig().getConfigParam('getSpecialExportURL');
};

/**
 * Show the total scores of all students
 * Go thru all of the classmates and get their score
 */
View.prototype.showScores = function() {
	var classmates = this.getUserAndClassInfo().vle.myClassInfo.classmates;
	var htmlSoFar = "score\tname\n";
	for (var i=0; i < classmates.length; i++) {
		var classmate = classmates[i];
		var classmateScore = annotations.getTotalScoreByToWorkgroup(classmate.workgroupId);
		htmlSoFar += classmateScore + "\t" + classmate.userName +"\n";
	}
	alert(htmlSoFar);
};

/**
 * Generate the tr rows for the export explanations page
 * @return a string containing the html for the rows that explain the
 * workgroup fields in the excel exports
 */
View.prototype.getWorkgroupExportExplanations = function() {

	var workgroupExportExplanations = [
		{
			label:"Workgroup Id",
			explanation:"the number id of the workgroup"
		},
		{
			label:"Wise Id 1",
			explanation:"the number id of the first member of the group. this id is tied directly to the student account."
		},
		{
			label:"Wise Id 2",
			explanation:"the number id of the second member of the group (if applicable). this id is tied directly to the student account."
		},
		{
			label:"Wise Id 3",
			explanation:"the number id of the third member of the group (if applicable). this id is tied directly to the student account."
		},
		{
			label:"Class Period",
			explanation:"the period the workgroup is in"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(workgroupExportExplanations);
};

/**
 * Generate the tr rows for the export explanations page
 * @return a string containing the html for the rows that explain the
 * run fields in the excel exports
 */
View.prototype.getRunExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var runExportExplanations = [
		{
			label:"Teacher Login",
			explanation:"the login of the teacher who created the run"
		},
		{
			label:"Project Id",
			explanation:"the id of the project"
		},
		{
			label:"Parent Project Id",
			explanation:"the id of the project that this project was copied from (if applicable)"
		},
		{
			label:"Project Name",
			explanation:"the name of the project"
		},
		{
			label:"Run Id",
			explanation:"the id of the run"
		},
		{
			label:"Run Name",
			explanation:"the name of the run"
		},
		{
			label:"Start Date",
			explanation:"the date the run was created"
		},
		{
			label:"End Date",
			explanation:"the date the run was archived (if applicable)"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(runExportExplanations);
};

/**
 * Generate the tr rows for the latest student work export explanations page
 * @return a string containing html for the rows that explain the fields
 * in the latest student work excel export
 */
View.prototype.getLatestStudentWorkExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var latestStudentWorkExportExplanations = [
		{
			label:"Step Title",
			explanation:"the title of the step"
		},
		{
			label:"Step Type",
			explanation:"the type of the step"
		},
		{
			label:"Step Prompt",
			explanation:"the prompt that the student reads on the step"
		},
		{
			label:"Node Id",
			explanation:"the id of the step which is unique within the project"
		},
		{
			label:"Step Extra",
			explanation:"extra information about that step (*the remaining rows below are some values that you may see in the Step Extra row)"
		},
		{
			label:"*Teacher Score Timestamp",
			explanation:"the timestamp when the teacher gave the score"
		},
		{
			label:"*Teacher Score",
			explanation:"the score from the teacher"
		},
		{
			label:"*Teacher Comment Timestamp",
			explanation:"the timestamp when the teacher gave the comment"
		},
		{
			label:"*Teacher Comment",
			explanation:"the comment from the teacher"
		},
		{
			label:"*Workgroup I am writing feedback to",
			explanation:"this step is the second step in a peer/teacher review sequence"
		},
		{
			label:"*Work from other workgroup",
			explanation:"this step is the second step in a peer/teacher review sequence"
		},
		{
			label:"*Workgroup that is writing feedback to me",
			explanation:"this step is the third step in a peer/teacher review sequence"
		},
		{
			label:"*Feedback from workgroup",
			explanation:"this step is the third step in a peer/teacher review sequence"
		},
		{
			label:"*Work that I have revised based on feedback",
			explanation:"this step is the third step in a peer/teacher review sequence"
		},
		{
			label:"*(other)",
			explanation:"for AssessmentList steps, this will display the prompt for each of the separate parts in the AssessmentList step"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(latestStudentWorkExportExplanations);
};

/**
 * Generate the tr rows for the all student work export explanations page
 * @return a string containing html for the rows that explain the fields
 * in the all student work excel export
 */
View.prototype.getAllStudentWorkExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var allStudentWorkExportExplanations = [
		{
			label:"#",
			explanation:"the step visit counter"
		},
		{
			label:"Wise Id 1",
			explanation:"the number id of the first member of the group. if the student was absent it will say 'Absent' after the number."
		},
		{
			label:"Wise Id 2",
			explanation:"the number id of the second member of the group (if applicable). if the student was absent it will say 'Absent' after the number."
		},
		{
			label:"Wise Id 3",
			explanation:"the number id of the third member of the group (if applicable). if the student was absent it will say 'Absent' after the number."
		},
		{
			label:"Step Title",
			explanation:"the title of the step"
		},
		{
			label:"Step Type",
			explanation:"the type of the step"
		},
		{
			label:"Step Prompt",
			explanation:"the prompt that the student reads on the step"
		},
		{
			label:"Node Id",
			explanation:"the id of the step which is unique within the project"
		},
		{
			label:"Start Time",
			explanation:"the timestamp when the student entered the step"
		},
		{
			label:"End Time",
			explanation:"the timestamp when the student exited the step"
		},
		{
			label:"Time Spent (Seconds)",
			explanation:"the amount of time the student spent on the step"
		},
		{
			label:"Teacher Score Timestamp",
			explanation:"the timestamp when the teacher gave the score"
		},
		{
			label:"Teacher Score",
			explanation:"the score from the teacher"
		},
		{
			label:"Teacher Comment Timestamp",
			explanation:"the timestamp when the teacher gave the comment"
		},
		{
			label:"Teacher Comment",
			explanation:"the comment from the teacher"
		},
		{
			label:"Classmate Id",
			explanation:"the id of the workgroup that this student is receiving text from (only applies for review sequence steps)"
		},
		{
			label:"Receiving Text",
			explanation:"the text received from the classmate (only applies for review sequence steps)"
		},
		{
			label:"Student Work or Student Work Part 1",
			explanation:"the work the student submitted for this step"
		},
		{
			label:"Student Work Part 2 (if applicable)",
			explanation:"the second part of the work the student submitted for this step (only applies to steps that have multiple parts such as AssessmentList)"
		},
		{
			label:"Student Work Part N (if applicable)",
			explanation:"the Nth part of the work the student submitted for this step (only applies to steps that have multiple parts such as AssessmentList)"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(allStudentWorkExportExplanations);
};

/**
 * Generate the tr rows for the idea baskets export explanations page
 * @return a string containing html for the rows that explain the fields
 * in the idea baskets excel export
 */
View.prototype.getIdeaBasketsExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var ideaBasketsExportExplanations = [
		{
			label:"Basket Revision",
			explanation:"the revision number of the basket. each time the student makes a change to the basket, the revision number is incremented."
		},
		{
			label:"Idea #",
			explanation:"the number of the idea within the basket. the idea number for an idea never changes even if the idea text is changed or the idea is repositioned within the basket."
		},
		{
			label:"Idea Text",
			explanation:"the text student entered for the idea"
		},
		{
			label:"Flag",
			explanation:"the flag the student chose for the idea"
		},
		{
			label:"Tags",
			explanation:"the tags the student entered for the idea"
		},
		{
			label:"Source",
			explanation:"the source the student chose for the idea"
		},
		{
			label:"Node Type",
			explanation:"the step type the student created the idea on"
		},
		{
			label:"Node Id Created On",
			explanation:"the id of the step the student created the idea on"
		},
		{
			label:"Node Name Created On",
			explanation:"the name of the step the student created the idea on"
		},
		{
			label:"Steps Used In Count",
			explanation:"the number of steps this idea is used in (such as explanation builder steps)"
		},
		{
			label:"Steps Used In",
			explanation:"the list of steps that this idea is used in (the ideas are comma delimited in this format nodeId:nodeTitle, nodeId:nodeTitle, ...)"
		},
		{
			label:"Trash",
			explanation:"whether the idea is in the trash (0 if no, 1 if yes)"
		},
		{
			label:"Timestamp Basket Saved",
			explanation:"the timestamp when this basket revision was saved"
		},
		{
			label:"Timestamp Idea Created",
			explanation:"the timestamp when this idea was created"
		},
		{
			label:"Timestamp Idea Last Edited",
			explanation:"the timestamp when this idea was last edited"
		},
		{
			label:"New",
			explanation:"whether the idea is new in this basket revision (0 if no, 1 if yes)"
		},
		{
			label:"Revised",
			explanation:"whether the idea was changed in this basket revision (0 if no, 1 if yes)"
		},
		{
			label:"Repositioned",
			explanation:"whether the position of this idea was changed within the basket in this basket revision (0 if no, 1 if yes)"
		},
		{
			label:"Steps Used In Changed",
			explanation:"whether the idea was either used or removed from a step in this basket revision (such as an explanation builder step) (0 if no, 1 if yes)"
		},
		{
			label:"Deleted In This Revision",
			explanation:"whether the idea was placed in the trash in this basket revision (0 if no, 1 if yes)"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(ideaBasketsExportExplanations);
};

/**
 * Generate the tr rows for the explanation builder work export explanations page
 * @return a string containing html for the rows that explain the fields
 * in the explanation builder work excel export
 */
View.prototype.getExplanationBuilderWorkExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var explanationBuilderWorkExportExplanations = [
		{
			label:"Step Work Id",
			explanation:"the id of the student work"
		},
		{
			label:"Step Title",
			explanation:"the title of the step"
		},
		{
			label:"Step Prompt",
			explanation:"the prompt of the step"
		},
		{
			label:"Node Id",
			explanation:"the id of the step"
		},
		{
			label:"Start Time",
			explanation:"the timestamp the student entered the step"
		},
		{
			label:"End Time",
			explanation:"the timestamp the student exited the step"
		},
		{
			label:"Time Spent (in seconds)",
			explanation:"the time the student spent on the step"
		},
		{
			label:"Answer",
			explanation:"the text the student entered into the bottom textarea in the explanation builder step"
		},
		{
			label:"Idea Id",
			explanation:"the id of the idea within the idea basket"
		},
		{
			label:"Idea Text",
			explanation:"the text the student wrote for this idea"
		},
		{
			label:"Idea X Position",
			explanation:"the x position of the upper left corner of the idea rectangle relative to the upper left corner of the background image"
		},
		{
			label:"Idea Y Position",
			explanation:"the y position of the upper left corner of the idea rectangle relative to the upper left corner of the background image"
		},
		{
			label:"Idea Color",
			explanation:"the color the student chose for the idea"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(explanationBuilderWorkExportExplanations);
};

/**
 * Generate the tr rows for the student names export explanations page
 * @return a string containing html for the rows that explain the fields
 * in the student names excel export
 */
View.prototype.getStudentNamesExportExplanations = function() {
	/*
	 * the array containing objects that contain the label and explanation for
	 * each tr row in the explanations page
	 */
	var studentNamesExportExplanations = [
		{
			label:"Period",
			explanation:"the period the student is in"
		},
		{
			label:"Workgroup Id",
			explanation:"the id of the workgroup"
		},
		{
			label:"Wise Id",
			explanation:"the id of the student"
		},
		{
			label:"Student Username",
			explanation:"the login username of the student"
		},
		{
			label:"Student Name",
			explanation:"the name of the name of the student"
		}
	];

	//generate the tr rows using the array
	return this.getExplanationTRs(studentNamesExportExplanations);
};

/**
 * Generate the tr rows for all the elements in the array
 * @param explanationArray an array containing objects, the objects
 * contain two fields, label and explanation
 * @return a string containing tr html
 */
View.prototype.getExplanationTRs = function(explanationArray) {
	var explanationHtml = "";

	//loop through all the elements in the array
	for (var x=0; x<explanationArray.length; x++) {
		//retrieve an object
		var explanationEntry = explanationArray[x];

		//get the label and explanation
		var label = explanationEntry.label;
		var explanation = explanationEntry.explanation;

		//create the tr html
		explanationHtml += "<tr>";
		explanationHtml += this.getExplanationTD(label) + this.getExplanationTD(explanation);
		explanationHtml += "</tr>";
	}

	return explanationHtml;
};

/**
 * Generate the td html
 * @param tdText the string to wrap in td
 * @return a string containing td html
 */
View.prototype.getExplanationTD = function(tdText) {
	var explanationTdHtml = "";

	//wrap the string in td
	explanationTdHtml += "<td class='exportExplanationTd'>";
	explanationTdHtml += tdText;
	explanationTdHtml += "</td>";

	return explanationTdHtml;
};

/**
 * Obtain the latest student work by calling render again to retrieve the
 * latest data.
 */
function refresh() {
	lock();
	render(this.contentURL, this.userURL, this.getDataUrl, this.contentBaseUrl, this.annotationsURL, this.annotationsURL, this.runId, this.flagsURL, this.flagsURL);
}

/**
 * Export the grades in the specified format.
 * Currently supported format(s):
 *   CSV
 */
function exportGrades(exportType) {
	 //display the popup window that contains the export data
	 displayExportData(exportType);

	 //send the export data to the server so it can echo it and we can save it as a file
	 vle.saveStudentWorkToFile(exportType);
}

var myMenu;

/**
 * Displays the export data in a new popup window. This is to allow
 * the teacher to be be able to copy and paste the export data
 * into their own text editor in case the data is too big and the
 * echo post fails causing the save dialog to not show up.
 *
 * @param exportType the file type to save the data as
 */
function displayExportData(exportType) {
	//make the new window
	var exportDataWin = window.open("", "exportData", "width=600,height=400");

	//get the export data from the vle
	var exportData = vle.getContentForFile(exportType);

	//make the message to display at the top of the pop up window
	var message = "<p>If you were asked to save the file you can ignore and close this window.</p>";
	message += "<p>If you were not asked to save the file, you can copy the contents in the box below and paste it into Notepad or Textedit and save it yourself.</p>";

	//make the textarea that will contain the export data
	var textBoxHtml = "<textarea rows='15' cols='70'>" + exportData + "</textarea>";

	//write the contents to the popup window
	exportDataWin.document.open();
	exportDataWin.document.write(message + textBoxHtml);
	exportDataWin.document.close();
}


//used to notify scriptloader that this script has finished loading
if (typeof eventManager != 'undefined') {
	eventManager.fire('scriptLoaded', 'vle/view/grading/gradingview_export.js');
};
