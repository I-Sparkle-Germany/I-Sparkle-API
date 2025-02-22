package org.wise.portal.presentation.web.controllers.user;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.switchuser.SwitchUserFilter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.domain.authentication.MutableUserDetails;
import org.wise.portal.domain.authentication.impl.StudentUserDetails;
import org.wise.portal.domain.authentication.impl.TeacherUserDetails;
import org.wise.portal.domain.group.Group;
import org.wise.portal.domain.project.Project;
import org.wise.portal.domain.run.Run;
import org.wise.portal.domain.user.User;
import org.wise.portal.domain.workgroup.Workgroup;
import org.wise.portal.presentation.web.exception.IncorrectPasswordException;
import org.wise.portal.presentation.web.response.ResponseEntityGenerator;
import org.wise.portal.service.mail.IMailFacade;
import org.wise.portal.service.password.PasswordService;
import org.wise.portal.service.project.ProjectService;
import org.wise.portal.service.run.RunService;
import org.wise.portal.service.student.StudentService;
import org.wise.portal.service.user.UserService;
import org.wise.portal.service.workgroup.WorkgroupService;

/**
 * User REST API
 *
 * @author Hiroki Terashima
 * @author Geoffrey Kwan
 * @author Jonathan Lim-Breitbart
 */
@RestController
@RequestMapping("/api/user")
public class UserAPIController {

  @Autowired
  protected Environment appProperties;

  @Autowired
  protected RunService runService;

  @Autowired
  protected UserService userService;

  @Autowired
  protected WorkgroupService workgroupService;

  @Autowired
  protected PasswordService passwordService;

  @Autowired
  protected ProjectService projectService;

  @Autowired
  protected IMailFacade mailService;

  @Autowired
  protected MessageSource messageSource;

  @Value("${microsoft.clientId:}")
  protected String microsoftClientId = "";

  @Autowired
  protected StudentService studentService;

  @Value("${google.clientId:}")
  protected String googleClientId = "";

  @Value("${google.clientSecret:}")
  private String googleClientSecret = "";

  protected static final String PROJECT_THUMB_PATH = "/assets/project_thumb.png";

  @GetMapping("/info")
  HashMap<String, Object> getUserInfo(Authentication auth,
      @RequestParam(value = "username", required = false) String username) {
    HashMap<String, Object> info = new HashMap<String, Object>();
    if (auth != null) {
      User user = userService.retrieveUserByUsername(auth.getName());
      info.put("id", user.getId());
      MutableUserDetails ud = user.getUserDetails();
      info.put("firstName", ud.getFirstname());
      info.put("lastName", ud.getLastname());
      info.put("username", ud.getUsername());
      info.put("isGoogleUser", ud.isGoogleUser());
      info.put("isPreviousAdmin", isPreviousAdmin(auth));
      info.put("language", ud.getLanguage());
      info.put("isGoogleUser", ud.isGoogleUser());
      info.put("roles", user.getRoles());
      if (user.isTeacher()) {
        TeacherUserDetails tud = (TeacherUserDetails) ud;
        info.put("displayName", tud.getDisplayname());
        info.put("email", tud.getEmailAddress());
        info.put("city", tud.getCity());
        info.put("state", tud.getState());
        info.put("country", tud.getCountry());
        info.put("schoolName", tud.getSchoolname());
        info.put("schoolLevel", tud.getSchoollevel());
      }
      return info;
    } else {
      info.put("username", username);
    }
    return info;
  }

  @Secured("ROLE_TEACHER")
  @GetMapping("/info/{userId}")
  HashMap<String, Object> getStudentUserInfoById(Authentication auth, @PathVariable Long userId)
      throws ObjectNotFoundException, AccessDeniedException {
    User teacherUser = userService.retrieveUserByUsername(auth.getName());
    User studentUser = userService.retrieveById(userId);
    if (studentService.isStudentAssociatedWithTeacher(studentUser, teacherUser)) {
      HashMap<String, Object> info = new HashMap<String, Object>();
      info.put("id", userId);
      StudentUserDetails details = (StudentUserDetails) studentUser.getUserDetails();
      info.put("username", details.getUsername());
      info.put("lastLoginTime", details.getLastLoginTime());
      info.put("signUpTime", details.getSignupdate());
      info.put("numberOfLogins", details.getNumberOfLogins());
      return info;
    } else {
      throw new AccessDeniedException("user is not associated with the student");
    }
  }

  boolean isPreviousAdmin(Authentication authentication) {
    for (GrantedAuthority authority : authentication.getAuthorities()) {
      if (SwitchUserFilter.ROLE_PREVIOUS_ADMINISTRATOR.equals(authority.getAuthority())) {
        return true;
      }
    }
    return false;
  }

  @GetMapping("/config")
  protected HashMap<String, Object> getConfig(HttpServletRequest request) {
    HashMap<String, Object> config = new HashMap<String, Object>();
    String contextPath = request.getContextPath();
    config.put("contextPath", contextPath);
    config.put("currentTime", System.currentTimeMillis());
    config.put("googleAnalyticsId", appProperties.getProperty("google_analytics_id"));
    config.put("googleClientId", googleClientId);
    config.put("isGoogleClassroomEnabled", isGoogleClassroomEnabled());
    config.put("logOutURL", contextPath + "/api/logout");
    config.put("microsoftClientId", microsoftClientId);
    config.put("recaptchaPublicKey", appProperties.getProperty("recaptcha_public_key"));
    config.put("wiseHostname", appProperties.getProperty("wise.hostname"));
    config.put("wise4Hostname", appProperties.getProperty("wise4.hostname"));
    config.put("discourseURL", appProperties.getProperty("discourse_url"));
    config.put("discourseNewsCategory", appProperties.getProperty("discourse_news_category"));
    return config;
  }

  private boolean isGoogleClassroomEnabled() {
    return !googleClientId.isEmpty() && !googleClientSecret.isEmpty();
  }

  @PostMapping("/check-authentication")
  HashMap<String, Object> checkAuthentication(@RequestParam("username") String username,
      @RequestParam("password") String password) {
    User user = userService.retrieveUserByUsername(username);
    HashMap<String, Object> response = new HashMap<String, Object>();
    if (user == null) {
      response.put("isUsernameValid", false);
      response.put("isPasswordValid", false);
    } else {
      response.put("isUsernameValid", true);
      response.put("isPasswordValid", userService.isPasswordCorrect(user, password));
      response.put("userId", user.getId());
      response.put("username", user.getUserDetails().getUsername());
      response.put("firstName", user.getUserDetails().getFirstname());
      response.put("lastName", user.getUserDetails().getLastname());
    }
    return response;
  }

  @PostMapping("/password")
  ResponseEntity<Map<String, Object>> changePassword(Authentication auth,
      @RequestParam("oldPassword") String oldPassword,
      @RequestParam("newPassword") String newPassword) {
    if (!passwordService.isValid(newPassword)) {
      Map<String, Object> map = passwordService.getErrors(newPassword);
      return ResponseEntityGenerator.createError(map);
    }
    User user = userService.retrieveUserByUsername(auth.getName());
    try {
      userService.updateUserPassword(user, oldPassword, newPassword);
      return ResponseEntityGenerator.createSuccess("passwordUpdated");
    } catch (IncorrectPasswordException e) {
      return ResponseEntityGenerator.createError("incorrectPassword");
    }
  }

  @GetMapping("/languages")
  List<HashMap<String, String>> getSupportedLanguages() {
    String supportedLocalesStr = appProperties.getProperty("supportedLocales", "");
    List<HashMap<String, String>> langs = new ArrayList<HashMap<String, String>>();
    for (String localeString : supportedLocalesStr.split(",")) {
      String langName = getLanguageName(localeString);
      HashMap<String, String> localeAndLang = new HashMap<String, String>();
      localeAndLang.put("locale", localeString);
      localeAndLang.put("language", langName);
      langs.add(localeAndLang);
    }
    return langs;
  }

  @Secured("ROLE_USER")
  @GetMapping("/run/info-by-id")
  HashMap<String, Object> getRunInfoById(Authentication auth, @RequestParam("runId") Long runId) {
    try {
      User user = userService.retrieveUserByUsername(auth.getName());
      Run run = runService.retrieveById(runId);
      if (userService.isUserAssociatedWithRun(user, run)) {
        return getRunInfo(run);
      }
    } catch (ObjectNotFoundException e) {
    }
    return createRunNotFoundInfo();
  }

  protected HashMap<String, Object> getRunInfo(Run run) {
    HashMap<String, Object> info = new HashMap<String, Object>();
    info.put("id", String.valueOf(run.getId()));
    info.put("name", run.getName());
    info.put("runCode", run.getRuncode());
    info.put("startTime", run.getStartTimeMilliseconds());
    info.put("endTime", run.getEndTimeMilliseconds());
    info.put("periods", getPeriodNames(run));
    User owner = run.getOwner();
    info.put("teacherFirstName", owner.getUserDetails().getFirstname());
    info.put("teacherLastName", owner.getUserDetails().getLastname());
    info.put("wiseVersion", run.getProject().getWiseVersion());
    return info;
  }

  private List<String> getPeriodNames(Run run) {
    List<String> periods = new ArrayList<String>();
    for (Group period : run.getPeriods()) {
      periods.add(period.getName());
    }
    return periods;
  }

  protected HashMap<String, Object> createRunNotFoundInfo() {
    HashMap<String, Object> info = new HashMap<String, Object>();
    info.put("error", "runNotFound");
    return info;
  }

  private String getLanguageName(String localeString) {
    if (localeString.toLowerCase().equals("zh_tw")) {
      return "Chinese (Traditional)";
    } else if (localeString.toLowerCase().equals("zh_cn")) {
      return "Chinese (Simplified)";
    } else {
      Locale locale = new Locale(localeString);
      return locale.getDisplayLanguage();
    }
  }

  private HashMap<String, Object> getProjectMap(Project project) {
    HashMap<String, Object> map = new HashMap<String, Object>();
    map.put("id", project.getId());
    map.put("name", project.getName());
    map.put("metadata", project.getMetadata());
    map.put("dateCreated", project.getDateCreated());
    map.put("dateArchived", project.getDateDeleted());
    map.put("projectThumb", projectService.getProjectPath(project) + PROJECT_THUMB_PATH);
    map.put("owner", convertUserToMap(project.getOwner()));
    map.put("sharedOwners", projectService.getProjectSharedOwnersList(project));
    map.put("parentId", project.getParentProjectId());
    map.put("wiseVersion", project.getWiseVersion());
    map.put("uri", projectService.getProjectURI(project));
    map.put("license", projectService.getLicensePath(project));
    return map;
  }

  protected HashMap<String, Object> getRunMap(User user, Run run) {
    HashMap<String, Object> map = new HashMap<String, Object>();
    map.put("id", run.getId());
    map.put("name", run.getName());
    map.put("maxStudentsPerTeam", run.getMaxWorkgroupSize());
    map.put("runCode", run.getRuncode());
    map.put("startTime", run.getStartTimeMilliseconds());
    map.put("endTime", run.getEndTimeMilliseconds());
    map.put("isLockedAfterEndDate", run.isLockedAfterEndDate());
    map.put("project", getProjectMap(run.getProject()));
    map.put("owner", convertUserToMap(run.getOwner()));
    map.put("numStudents", run.getNumStudents());
    map.put("wiseVersion", run.getProject().getWiseVersion());

    if (user.isStudent()) {
      addStudentInfoToRunMap(user, run, map);
    }
    return map;
  }

  private void addStudentInfoToRunMap(User user, Run run, HashMap<String, Object> map) {
    map.put("periodName", run.getPeriodOfStudent(user).getName());
    List<Workgroup> workgroups = workgroupService.getWorkgroupListByRunAndUser(run, user);
    if (workgroups.size() > 0) {
      Workgroup workgroup = workgroups.get(0);
      List<HashMap<String, Object>> workgroupMembers = new ArrayList<HashMap<String, Object>>();
      StringBuilder workgroupNames = new StringBuilder();
      for (User member : workgroup.getMembers()) {
        MutableUserDetails userDetails = (MutableUserDetails) member.getUserDetails();
        HashMap<String, Object> memberMap = new HashMap<String, Object>();
        memberMap.put("id", member.getId());
        String firstName = userDetails.getFirstname();
        memberMap.put("firstName", firstName);
        String lastName = userDetails.getLastname();
        memberMap.put("lastName", lastName);
        memberMap.put("username", userDetails.getUsername());
        memberMap.put("isGoogleUser", userDetails.isGoogleUser());
        workgroupMembers.add(memberMap);
        if (workgroupNames.length() > 0) {
          workgroupNames.append(", ");
        }
        workgroupNames.append(firstName + " " + lastName);
        map.put("workgroupId", workgroup.getId());
        map.put("workgroupNames", workgroupNames.toString());
        map.put("workgroupMembers", workgroupMembers);
      }
    }
  }

  protected HashMap<String, Object> convertUserToMap(User user) {
    HashMap<String, Object> map = new HashMap<String, Object>();
    MutableUserDetails userDetails = user.getUserDetails();
    map.put("id", user.getId());
    map.put("username", userDetails.getUsername());
    map.put("firstName", userDetails.getFirstname());
    map.put("lastName", userDetails.getLastname());
    map.put("isGoogleUser", userDetails.isGoogleUser());
    if (userDetails instanceof TeacherUserDetails) {
      map.put("displayName", ((TeacherUserDetails) userDetails).getDisplayname());
    }
    return map;
  }

  protected Boolean isNameValid(String name) {
    Pattern p = Pattern.compile("^(?![ -])[a-zA-Z -]+(?<![ -])$");
    Matcher m = p.matcher(name);
    return m.matches();
  }

  protected Boolean isFirstNameAndLastNameValid(String firstName, String lastName) {
    return isNameValid(firstName) && isNameValid(lastName);
  }

  protected String getInvalidNameMessageCode(String firstName, String lastName) {
    Boolean isFirstNameValid = isNameValid((firstName));
    Boolean isLastNameValid = isNameValid((lastName));
    String messageCode = "";
    if (!isFirstNameValid && !isLastNameValid) {
      messageCode = "invalidFirstAndLastName";
    } else if (!isFirstNameValid) {
      messageCode = "invalidFirstName";
    } else if (!isLastNameValid) {
      messageCode = "invalidLastName";
    }
    return messageCode;
  }

  protected ResponseEntity<Map<String, Object>> createRegisterSuccessResponse(String username) {
    HashMap<String, Object> body = new HashMap<String, Object>();
    body.put("username", username);
    return ResponseEntityGenerator.createSuccess(body);
  }
}
