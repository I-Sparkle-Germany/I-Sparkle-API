package org.wise.portal.presentation.web.controllers.project;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.domain.portal.Portal;
import org.wise.portal.domain.project.Project;
import org.wise.portal.domain.project.impl.ProjectImpl;
import org.wise.portal.domain.user.User;
import org.wise.portal.domain.usertag.UserTag;
import org.wise.portal.presentation.web.controllers.ControllerUtil;
import org.wise.portal.service.portal.PortalService;
import org.wise.portal.service.project.ProjectService;
import org.wise.portal.service.usertags.UserTagsService;
import org.wise.vle.web.SecurityUtils;

/**
 * Project REST API
 *
 * @author Hiroki Terashima
 * @author Geoffrey Kwan
 * @author Jonathan Lim-Breitbart
 */
@RestController
@RequestMapping(value = "/api/project", produces = "application/json;charset=UTF-8")
public class ProjectAPIController {

  @Autowired
  PortalService portalService;

  @Autowired
  ProjectService projectService;

  @Autowired
  private UserTagsService userTagsService;

  @GetMapping("/library")
  protected String getLibraryProjects(ModelMap modelMap)
      throws ObjectNotFoundException, JSONException {
    Portal portal = portalService.getById(new Integer(1));
    String projectLibraryGroups = portal.getProjectLibraryGroups();
    JSONArray projectLibraryGroupsJSON = new JSONArray(projectLibraryGroups);
    for (int g = 0; g < projectLibraryGroupsJSON.length(); g++) {
      JSONObject projectLibraryGroup = projectLibraryGroupsJSON.getJSONObject(g);
      if (canAccess(projectLibraryGroup)) {
        populateProjectMetadata(projectLibraryGroup);
      } else {
        projectLibraryGroupsJSON.remove(g--);
      }
    }
    return projectLibraryGroupsJSON.toString();
  }

  private boolean canAccess(JSONObject projectLibraryGroup) throws JSONException {
    if (!projectLibraryGroup.has("accessRoles")) {
      return true;
    }
    User signedInUser = ControllerUtil.getSignedInUser();
    if (signedInUser == null) {
      return false;
    } else {
      JSONArray accessRoles = projectLibraryGroup.getJSONArray("accessRoles");
      for (int a = 0; a < accessRoles.length(); a++) {
        String accessRole = accessRoles.getString(a);
        if (accessRole.equals("admin") && signedInUser.isAdmin()) {
          return true;
        } else if (accessRole.equals("researcher") && signedInUser.isResearcher()) {
          return true;
        } else if (accessRole.equals("teacher") && signedInUser.isTeacher()) {
          return true;
        }
      }
      return false;
    }
  }

  @GetMapping("/community")
  protected String getCommunityLibraryProjects(ModelMap modelMap) throws JSONException {
    List<Project> teacherSharedProjects = projectService.getTeacherSharedProjectList();
    JSONArray projectsJSON = getProjectsJSON(teacherSharedProjects);
    return projectsJSON.toString();
  }

  @GetMapping("/personal")
  protected String getPersonalLibraryProjects(ModelMap modelMap) throws JSONException {
    User signedInUser = ControllerUtil.getSignedInUser();
    List<Project> projectsWithoutRuns = projectService.getProjectsWithoutRuns(signedInUser);
    JSONArray projectsJSON = getProjectsWithTagsJSON(signedInUser, projectsWithoutRuns);
    return projectsJSON.toString();
  }

  @GetMapping("/shared")
  protected String getSharedLibraryProjects(ModelMap modelMap) throws JSONException {
    User signedInUser = ControllerUtil.getSignedInUser();
    List<Project> sharedProjectList = projectService.getSharedProjectsWithoutRun(signedInUser);
    JSONArray projectsJSON = getProjectsWithTagsJSON(signedInUser, sharedProjectList);
    return projectsJSON.toString();
  }

  @GetMapping("/personal-and-shared")
  protected String getPersonalAndSharedProjects(ModelMap modelMap) throws JSONException {
    User signedInUser = ControllerUtil.getSignedInUser();
    List<Project> projects = projectService.getProjectList(signedInUser);
    projects.addAll(projectService.getSharedProjectList(signedInUser));
    JSONArray projectsJSON = getProjectsWithTagsJSON(signedInUser, projects);
    return projectsJSON.toString();
  }

  @GetMapping("/info/{projectId}")
  protected String getProjectInfo(@PathVariable("projectId") ProjectImpl project)
      throws ObjectNotFoundException, JSONException {
    JSONObject projectJSON = ControllerUtil.getProjectJSON(project);
    return projectJSON.toString();
  }

  private JSONArray getProjectsJSON(List<Project> projectList) throws JSONException {
    JSONArray projectsJSON = new JSONArray();
    for (Project project : projectList) {
      projectsJSON.put(ControllerUtil.getProjectJSON(project));
    }
    return projectsJSON;
  }

  private JSONArray getProjectsWithTagsJSON(User user, List<Project> projectList)
      throws JSONException {
    JSONArray projectsJSON = new JSONArray();
    for (Project project : projectList) {
      JSONObject projectJSON = ControllerUtil.getProjectJSON(project);
      projectJSON.put("tags", convertTagsToJsonArray(userTagsService.getTagsList(user, project)));
      projectsJSON.put(projectJSON);
    }
    return projectsJSON;
  }

  private JSONArray convertTagsToJsonArray(List<UserTag> tags) {
    JSONArray tagsJSONArray = new JSONArray();
    for (UserTag tag : tags) {
      tagsJSONArray.put(tag.toMap());
    }
    return tagsJSONArray;
  }

  private JSONObject populateProjectMetadata(JSONObject projectLibraryGroup) throws JSONException {
    if (projectLibraryGroup.getString("type").equals("group")) {
      JSONArray children = projectLibraryGroup.getJSONArray("children");
      for (int c = 0; c < children.length(); c++) {
        JSONObject childJSON = children.getJSONObject(c);
        if (canAccess(childJSON)) {
          children.put(c, populateProjectMetadata(childJSON));
        } else {
          children.remove(c--);
        }
      }
    } else if (projectLibraryGroup.getString("type").equals("project")) {
      Integer projectId = projectLibraryGroup.getInt("id");
      try {
        Project project = projectService.getById(projectId);
        JSONObject projectJSON = ControllerUtil.getProjectJSON(project);
        projectJSON.put("type", "project");
        return projectJSON;
      } catch (ObjectNotFoundException e) {
        e.printStackTrace();
      }
    }
    return projectLibraryGroup;
  }

  @PostMapping("/copy")
  protected String copyProject(@RequestParam("projectId") ProjectImpl project) throws Exception {
    User user = ControllerUtil.getSignedInUser();
    if (SecurityUtils.isTeacher(user)) {
      if (this.projectService.canReadProject(project, user)) {
        Project newProject = projectService.copyProject(project.getId(), user);
        return ControllerUtil.getProjectJSON(newProject).toString();
      }
    }
    return ControllerUtil.createErrorResponse("copyProjectError").toString();
  }
}
