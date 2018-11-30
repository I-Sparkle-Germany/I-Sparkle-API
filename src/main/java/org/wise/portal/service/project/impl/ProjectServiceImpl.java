/**
 * Copyright (c) 2008-2017 Regents of the University of California (Regents).
 * Created by WISE, Graduate School of Education, University of California, Berkeley.
 *
 * This software is distributed under the GNU General Public License, v3,
 * or (at your option) any later version.
 *
 * Permission is hereby granted, without written agreement and without license
 * or royalty fees, to use, copy, modify, and distribute this software and its
 * documentation for any purpose, provided that the above copyright notice and
 * the following two paragraphs appear in all copies of this software.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE. THE SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED
 * HEREUNDER IS PROVIDED "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE
 * MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT,
 * SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS,
 * ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
 * REGENTS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.wise.portal.service.project.impl;

import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.acls.domain.BasePermission;
import org.springframework.security.acls.model.AlreadyExistsException;
import org.springframework.security.acls.model.NotFoundException;
import org.springframework.security.acls.model.Permission;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.view.RedirectView;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.dao.project.ProjectDao;
import org.wise.portal.dao.user.UserDao;
import org.wise.portal.domain.authentication.MutableUserDetails;
import org.wise.portal.domain.impl.AddSharedTeacherParameters;
import org.wise.portal.domain.project.FamilyTag;
import org.wise.portal.domain.project.Project;
import org.wise.portal.domain.project.ProjectMetadata;
import org.wise.portal.domain.project.Tag;
import org.wise.portal.domain.project.impl.*;
import org.wise.portal.domain.run.Run;
import org.wise.portal.domain.user.User;
import org.wise.portal.domain.workgroup.Workgroup;
import org.wise.portal.presentation.web.controllers.ControllerUtil;
import org.wise.portal.presentation.web.exception.NotAuthorizedException;
import org.wise.portal.presentation.web.exception.TeacherAlreadySharedWithProjectException;
import org.wise.portal.presentation.web.response.SharedOwner;
import org.wise.portal.service.acl.AclService;
import org.wise.portal.service.authentication.UserDetailsService;
import org.wise.portal.service.premadecomment.PremadeCommentService;
import org.wise.portal.service.project.ProjectService;
import org.wise.portal.service.run.RunService;
import org.wise.portal.service.tag.TagService;
import org.wise.portal.service.user.UserService;
import org.wise.vle.utils.FileManager;

import java.io.Serializable;
import java.util.*;

/**
 * @author Patrick Lawler
 */
public class ProjectServiceImpl implements ProjectService {

  @Autowired
  private Properties wiseProperties;

  @Autowired
  private ProjectDao<Project> projectDao;

  @Autowired
  private AclService<Project> aclService;

  @Autowired
  private UserService userService;

  @Autowired
  private TagService tagService;

  @Autowired
  private RunService runService;

  @Autowired
  private PremadeCommentService premadeCommentService;

  @Autowired
  private UserDao<User> userDao;

  public void addBookmarkerToProject(Project project, User bookmarker) {
    project.getBookmarkers().add(bookmarker);
    projectDao.save(project);
  }

  public void addSharedTeacherToProject(AddSharedTeacherParameters addSharedTeacherParameters) {
    Project project = addSharedTeacherParameters.getProject();
    String sharedOwnerUsername = addSharedTeacherParameters.getSharedOwnerUsername();
    User user = userService.retrieveUserByUsername(sharedOwnerUsername);
    project.getSharedowners().add(user);
    projectDao.save(project);

    String permission = addSharedTeacherParameters.getPermission();
    if (permission.equals(UserDetailsService.PROJECT_WRITE_ROLE)) {
      aclService.removePermission(project, BasePermission.ADMINISTRATION, user);
      aclService.removePermission(project, BasePermission.READ, user);
      aclService.addPermission(project, BasePermission.WRITE, user);
    } else if (permission.equals(UserDetailsService.PROJECT_READ_ROLE)) {
      aclService.removePermission(project, BasePermission.ADMINISTRATION, user);
      aclService.removePermission(project, BasePermission.WRITE, user);
      aclService.addPermission(project, BasePermission.READ, user);
    } else if (permission.equals(UserDetailsService.PROJECT_SHARE_ROLE)) {
      aclService.removePermission(project, BasePermission.READ, user);
      aclService.removePermission(project, BasePermission.WRITE, user);
      aclService.addPermission(project, BasePermission.ADMINISTRATION, user);
    }
  }

  public SharedOwner addSharedTeacher(Long projectId, String teacherUsername)
      throws ObjectNotFoundException, TeacherAlreadySharedWithProjectException {
    User user = userDao.retrieveByUsername(teacherUsername);
    Project project = this.getById(projectId);
    if (!project.getSharedowners().contains(user)) {
      project.getSharedowners().add(user);
      this.projectDao.save(project);
      this.aclService.addPermission(project, ProjectPermission.VIEW_PROJECT, user);
      List<Integer> newPermissions = new ArrayList<>();
      newPermissions.add(ProjectPermission.VIEW_PROJECT.getMask());
      return new SharedOwner(user.getId(), user.getUserDetails().getUsername(),
        user.getUserDetails().getFirstname(), user.getUserDetails().getLastname(), newPermissions);
    } else {
      throw new TeacherAlreadySharedWithProjectException(teacherUsername + " is already shared with this project");
    }
  }

  public void removeSharedTeacherFromProject(String username, Project project) {
    User user = userService.retrieveUserByUsername(username);
    if (project == null || user == null) {
      return;
    }

    if (project.getSharedowners().contains(user)) {
      project.getSharedowners().remove(user);
      projectDao.save(project);
      try {
        List<Permission> permissions = aclService.getPermissions(project, user);
        for (Permission permission : permissions) {
          aclService.removePermission(project, permission, user);
        }
      } catch (Exception e) {
        // do nothing. permissions might get be deleted if user requesting the deletion is not the owner of the project.
      }
    }
  }

  @Transactional(rollbackFor = { AlreadyExistsException.class,
    NotFoundException.class, DataIntegrityViolationException.class
  })
  public Project createProject(ProjectParameters projectParameters) throws ObjectNotFoundException {
    Project project = projectDao.createEmptyProject();
    project.setModulePath(projectParameters.getModulePath());
    project.setName(projectParameters.getProjectname());
    project.setOwner(projectParameters.getOwner());
    project.setProjectType(projectParameters.getProjectType());
    project.setWISEVersion(projectParameters.getWiseVersion());
    ProjectMetadata metadata = projectParameters.getMetadata();
    Long parentProjectId = projectParameters.getParentProjectId();
    Project parentProject = null;

    if (parentProjectId != null) {
      parentProject = getById(parentProjectId);
      project.setMaxTotalAssetsSize(parentProject.getMaxTotalAssetsSize());
    }

    JSONObject metaJSON = new JSONObject(metadata);
    if (metaJSON.has("author")) {
      try {
        String author = metaJSON.getString("author");
        if (author == null || author.equals("null") || author.equals("")) {
          JSONObject authorJSON = new JSONObject();
          Long rootId = project.getRootProjectId();
          if (rootId == null) {
            try {
              rootId = identifyRootProjectId(parentProject);
              project.setRootProjectId(rootId);
            } catch (ObjectNotFoundException e) {
              // TODO Auto-generated catch block
              e.printStackTrace();
            }
          }
          try {
            if (rootId != null) {
              Project rootP = getById(rootId);
              User owner = rootP.getOwner();
              MutableUserDetails ownerDetails = owner.getUserDetails();
              try {
                authorJSON.put("username", ownerDetails.getUsername());
                authorJSON.put("fullname",
                    ownerDetails.getFirstname() + " " + ownerDetails.getLastname());
              } catch (JSONException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
              }
              metadata.setAuthor(authorJSON.toString());
            }
          } catch (ObjectNotFoundException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
          }
        }
      } catch (JSONException e) {
        // TODO Auto-generated catch block
        e.printStackTrace();
      }

    }
    project.setMetadata(metadata);
    //TODO -- isCurrent being set here may need to be removed
    project.setFamilytag(FamilyTag.TELS);
    project.setCurrent(true);
    project.setParentProjectId(projectParameters.getParentProjectId());
    project.setDateCreated(new Date());
    projectDao.save(project);
    aclService.addPermission(project, BasePermission.ADMINISTRATION);

    if (parentProjectId != null) {
      Long newProjectId = (Long) project.getId();
      User signedInUser = ControllerUtil.getSignedInUser();
      premadeCommentService.copyPremadeCommentsFromProject(parentProjectId, newProjectId, signedInUser);
    }
    return project;
  }

  public List<Project> getBookmarkerProjectList(User bookmarker) {
    return projectDao.getProjectListByUAR(bookmarker, "bookmarker");
  }

  @Transactional(readOnly = true)
  public Project getById(Serializable projectId) throws ObjectNotFoundException {
    Project project = projectDao.getById(projectId);
    project.populateProjectInfo();
    return project;
  }

  @Secured( { "ROLE_USER", "AFTER_ACL_COLLECTION_READ" })
  public List<Project> getProjectList(User user) {
    return projectDao.getProjectListByOwner(user);
  }

  public List<Project> getSharedProjectList(User user) {
    return projectDao.getProjectListByUAR(user, "sharedowner");
  }

  public String getSharedTeacherRole(Project project, User user) {
    List<Permission> permissions = aclService.getPermissions(project, user);
    // for projects, a user can have at most one permission per project
    if (!permissions.isEmpty()) {
      if (permissions.contains(BasePermission.ADMINISTRATION)) {
        return UserDetailsService.PROJECT_SHARE_ROLE;
      }
      Permission permission = permissions.get(0);
      if (permission.equals(BasePermission.READ)) {
        return UserDetailsService.PROJECT_READ_ROLE;
      } else if (permission.equals(BasePermission.WRITE)) {
        return UserDetailsService.PROJECT_WRITE_ROLE;
      }
    }
    return null;
  }

  public List<Project> getAdminProjectList() {
    return projectDao.getList();
  }

  public ModelAndView launchProject(Workgroup workgroup, String contextPath) throws Exception {
    return new ModelAndView(new RedirectView(generateStudentStartProjectUrlString(workgroup, contextPath)));
  }

  public ModelAndView previewProject(PreviewProjectParameters params) throws Exception {
    Project project = params.getProject();
    if (project.getWiseVersion().equals(4)) {
      return previewProjectWISE4(params, project);
    } else {
      return previewProjectWISE5(params, project);
    }
  }

  private ModelAndView previewProjectWISE5(PreviewProjectParameters params, Project project) {
    String contextPath = params.getHttpServletRequest().getContextPath();
    String wise5URL = contextPath + "/project/" + project.getId();
    return new ModelAndView(new RedirectView(wise5URL));
  }

  private ModelAndView previewProjectWISE4(PreviewProjectParameters params, Project project) {
    String contextPath = params.getHttpServletRequest().getContextPath();
    String vleConfigUrl =
        contextPath + "/vleconfig" + "?projectId=" + project.getId() + "&mode=preview";

    String step = params.getStep();
    if (step != null) {
      vleConfigUrl += "&step=" + step;
    }

    String userSpecifiedLang = params.getLang();
    if (userSpecifiedLang != null) {
      vleConfigUrl += "&lang=" + userSpecifiedLang;
    }

    if (params.isConstraintsDisabled()) {
      vleConfigUrl += "&isConstraintsDisabled=true";
    }

    String workgroupId = params.getWorkgroupId();
    if (workgroupId != null) {
      vleConfigUrl += "&workgroupId=" + workgroupId;
    }

    ModelAndView modelAndView = new ModelAndView("vle");
    String vleurl = contextPath + "/vle/vle.html";
    modelAndView.addObject("vleurl", vleurl);
    modelAndView.addObject("vleConfigUrl", vleConfigUrl);
    String curriculumBaseWWW = wiseProperties.getProperty("curriculum_base_www");
    String rawProjectUrl = project.getModulePath();
    String contentUrl = curriculumBaseWWW + rawProjectUrl;
    modelAndView.addObject("contentUrl", contentUrl);
    return modelAndView;
  }

  @Transactional()
  public void removeBookmarkerFromProject(Project project, User bookmarker) {
    project.getBookmarkers().remove(bookmarker);
    projectDao.save(project);
  }

  public void updateProject(Project project, User user) throws NotAuthorizedException {
    // check to see if user can author project or the run that it's in
    List<Run> runList = runService.getProjectRuns((Long) project.getId());
    Run run = null;
    if (!runList.isEmpty()) {
      // since a project can now only be run once, just use the first run in the list
      run = runList.get(0);
    }

    if (user.isAdmin() || aclService.hasPermission(project, BasePermission.ADMINISTRATION, user) ||
        aclService.hasPermission(project, BasePermission.WRITE, user) ||
      (run != null && runService.hasRunPermission(run, user, BasePermission.WRITE))) {
      projectDao.save(project);
    } else {
      throw new NotAuthorizedException("You are not authorized to update this project");
    }
  }

  /**
   * Returns url string for starting the run
   * @param workgroup Workgroup requesting to launch the project
   * @return url string that, when accessed, will launch the project
   */
  public String generateStudentStartProjectUrlString(Workgroup workgroup, String contextPath) {
    Run run = workgroup.getRun();
    Project project = run.getProject();
    Integer wiseVersion = project.getWiseVersion();
    if (wiseVersion.equals(4)) {
      return contextPath + "/student/vle/vle.html?runId=" +
          run.getId() + "&workgroupId=" + workgroup.getId();
    } else if (wiseVersion.equals(5)) {
      return contextPath + "/student/run/" + run.getId();
    }
    return null;
  }

  public boolean canCreateRun(Project project, User user) {
    Set<String> unallowed_tagnames = new HashSet<String>();
    unallowed_tagnames.add("review");
    return !project.hasTags(unallowed_tagnames) &&
        (FamilyTag.TELS.equals(project.getFamilytag()) ||
        aclService.hasPermission(project, BasePermission.ADMINISTRATION, user) ||
        aclService.hasPermission(project, BasePermission.READ, user));
  }

  public boolean canAuthorProject(Project project, User user) {
    return user.isAdmin() ||
        aclService.hasPermission(project, BasePermission.ADMINISTRATION, user) ||
        aclService.hasPermission(project, BasePermission.WRITE, user);
  }

  public boolean canReadProject(Project project, User user) {
    return user.isAdmin() ||
        aclService.hasPermission(project, BasePermission.ADMINISTRATION, user) ||
        aclService.hasPermission(project, BasePermission.WRITE, user) ||
        aclService.hasPermission(project, BasePermission.READ, user);
  }

  @CacheEvict(value = "project", allEntries = true)
  public Integer addTagToProject(String tagString, Long projectId) {
    Tag tag = tagService.createOrGetTag(tagString);
    Project project = null;
    try {
      project = projectDao.getById(projectId);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }

    if (!tagService.isFromDatabase(tag)) {
      tag = tagService.createOrGetTag(tag.getName());
    }

    project.getTags().add(tag);
    projectDao.save(project);
    return (Integer) tag.getId();
  }

  @CacheEvict(value = "project", allEntries = true)
  @Transactional
  public void removeTagFromProject(Integer tagId, Long projectId) {
    Tag tag = tagService.getTagById(tagId);
    Project project = null;
    try {
      project = projectDao.getById(projectId);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }

    if (tag != null && project != null) {
      project.getTags().remove(tag);
      projectDao.save(project);
      tagService.removeIfOrphaned((Integer)tag.getId());
    }
  }

  @Transactional
  public Integer updateTag(Integer tagId, Long projectId, String name) {
    Tag currentTag = tagService.getTagById(tagId);

    // if the current tag's name is equivalent of the given name to change
    // to, then we do not need to do anything, so just return the currentTag's id
    if (currentTag.getName().toLowerCase().equals(name.toLowerCase())) {
      return (Integer) currentTag.getId();
    }

    removeTagFromProject(tagId, projectId);
    return addTagToProject(name, projectId);
  }

  public boolean isAuthorizedToCreateTag(User user, String name) {
    return user.isAdmin() || !name.toLowerCase().equals("library");
  }

  public boolean projectContainsTag(Project project, String name) {
    project.getTags().size();  // force-fetch project tags from db
    for (Tag t : project.getTags()) {
      if (t.getName().toLowerCase().equals(name.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  @Transactional
  public List<Project> getLibraryProjectList() {
    Set<String> tagNames = new TreeSet<String>();
    tagNames.add("library");
    return getProjectListByTagNames(tagNames);
  }

  @Cacheable("project")
  @Transactional
  public List<Project> getPublicLibraryProjectList() {
    Set<String> tagNames = new TreeSet<String>();
    tagNames.add("library");
    tagNames.add("public");
    return getProjectListByTagNames(tagNames);
  }

  @Transactional
  public List<Project> getTeacherSharedProjectList() {
    Set<String> tagNames = new TreeSet<String>();
    tagNames.add("teachershared");
    tagNames.add("public");
    return getProjectListByTagNames(tagNames);
  }

  public List<Project> getProjectListByTagNames(Set<String> tagNames) {
    return projectDao.getProjectListByTagNames(tagNames);
  }

  public List<Project> getProjectListByAuthorName(String authorName) {
    return projectDao.getProjectListByAuthorName(authorName);
  }

  public List<Project> getProjectListByTitle(String title) {
    return projectDao.getProjectListByTitle(title);
  }

  public List<Project> getProjectCopies(Long projectId) {
    return projectDao.getProjectCopies(projectId);
  }

  public Long identifyRootProjectId(Project project) throws ObjectNotFoundException {
    if (project == null) {
      return null;
    } else {
      Long parentProjectId = project.getParentProjectId();
      if (parentProjectId == null || projectContainsTag(project, "library")) {
        return (Long) project.getId();
      } else {
        return identifyRootProjectId(getById(parentProjectId));
      }
    }
  }

  public Project copyProject(Integer projectId, User user) throws Exception {
    Project parentProject = getById(projectId);
    String projectFolderPath = FileManager.getProjectFolderPath(parentProject);
    String curriculumBaseDir = wiseProperties.getProperty("curriculum_base_dir");
    String newProjectDirname = FileManager.copyProject(curriculumBaseDir, projectFolderPath);
    String projectModulePath = parentProject.getModulePath();
    String projectJSONFilename = projectModulePath.substring(projectModulePath.lastIndexOf("/") + 1);
    String newProjectPath = "/" + newProjectDirname + "/" + projectJSONFilename;
    String newProjectName = parentProject.getName();
    Long parentProjectId = (Long) parentProject.getId();
    ProjectParameters pParams = new ProjectParameters();
    pParams.setModulePath(newProjectPath);
    pParams.setOwner(user);
    pParams.setProjectname(newProjectName);
    pParams.setProjectType(ProjectType.LD);
    pParams.setWiseVersion(parentProject.getWiseVersion());
    pParams.setParentProjectId(parentProjectId);
    ProjectMetadata parentProjectMetadata = parentProject.getMetadata();
    if (parentProjectMetadata != null) {
      ProjectMetadata newProjectMetadata = new ProjectMetadataImpl(parentProjectMetadata.toJSONString());
      pParams.setMetadata(newProjectMetadata);
    }
    return createProject(pParams);
  }

  public List<Permission> getSharedTeacherPermissions(Project project, User sharedTeacher) {
    return this.aclService.getPermissions(project, sharedTeacher);
  }

  SharedOwner createNewSharedOwner(String username) {
    User user = userService.retrieveUserByUsername(username);
    MutableUserDetails userDetails = user.getUserDetails();
    Long userId = user.getId();
    String firstName = userDetails.getFirstname();
    String lastName = userDetails.getLastname();
    List<Integer> permissions = new ArrayList<>();
    permissions.add(ProjectPermission.EDIT_PROJECT.getMask());
    return new SharedOwner(userId, username, firstName, lastName, permissions);
  }

  public void removeSharedTeacher(Long projectId, String username)
      throws ObjectNotFoundException {
    removeSharedTeacherFromProject(username, getById(projectId));
  }

  public void addSharedTeacherPermission(Long projectId, Long userId, Integer permissionId)
      throws ObjectNotFoundException {
    User user = userService.retrieveById(userId);
    Project project = getById(projectId);
    if (project.getSharedowners().contains(user)) {
      this.aclService.addPermission(project, new ProjectPermission(permissionId), user);
    }
  }

  public void removeSharedTeacherPermission(Long projectId, Long userId, Integer permissionId)
      throws ObjectNotFoundException {
    User user = userService.retrieveById(userId);
    Project project = getById(projectId);
    if (project.getSharedowners().contains(user)) {
      this.aclService.removePermission(project, new ProjectPermission(permissionId), user);
    }
  }

  public List<Project> getProjectsWithoutRuns(User user) {
    return projectDao.getProjectsWithoutRuns(user);
  }

  public List<Project> getAllSharedProjects() {
    return projectDao.getAllSharedProjects();
  }
}
