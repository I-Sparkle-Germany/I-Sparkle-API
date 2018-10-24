/**
 * Copyright (c) 2007-2017 Regents of the University of California (Regents).
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
package org.wise.portal.service.run.impl;

import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.acls.domain.BasePermission;
import org.springframework.security.acls.model.Permission;
import org.springframework.transaction.annotation.Transactional;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.dao.group.GroupDao;
import org.wise.portal.dao.project.ProjectDao;
import org.wise.portal.dao.run.RunDao;
import org.wise.portal.dao.user.UserDao;
import org.wise.portal.domain.PeriodNotFoundException;
import org.wise.portal.domain.Persistable;
import org.wise.portal.domain.announcement.Announcement;
import org.wise.portal.domain.group.Group;
import org.wise.portal.domain.group.impl.PersistentGroup;
import org.wise.portal.domain.impl.AddSharedTeacherParameters;
import org.wise.portal.domain.portal.Portal;
import org.wise.portal.domain.project.Project;
import org.wise.portal.domain.run.Run;
import org.wise.portal.domain.run.impl.RunImpl;
import org.wise.portal.domain.run.impl.RunParameters;
import org.wise.portal.domain.run.impl.RunPermission;
import org.wise.portal.domain.user.User;
import org.wise.portal.domain.workgroup.Workgroup;
import org.wise.portal.presentation.web.exception.TeacherAlreadySharedWithRunException;
import org.wise.portal.presentation.web.response.SharedOwner;
import org.wise.portal.service.acl.AclService;
import org.wise.portal.service.authentication.UserDetailsService;
import org.wise.portal.service.portal.PortalService;
import org.wise.portal.service.project.ProjectService;
import org.wise.portal.service.run.DuplicateRunCodeException;
import org.wise.portal.service.run.RunService;
import org.wise.portal.service.workgroup.WorkgroupService;

import java.util.*;

/**
 * Services for WISE Run
 *
 * @author Hiroki Terashima
 * @author Geoffrey Kwan
 */
public class RunServiceImpl implements RunService {

  private String DEFAULT_RUNCODE_PREFIXES = "Tiger,Lion,Fox,Owl,Panda,Hawk,Mole,"+
    "Falcon,Orca,Eagle,Manta,Otter,Cat,Zebra,Flea,Wolf,Dragon,Seal,Cobra,"+
    "Bug,Gecko,Fish,Koala,Mouse,Wombat,Shark,Whale,Sloth,Slug,Ant,Mantis,"+
    "Bat,Rhino,Gator,Monkey,Swan,Ray,Crow,Goat,Marmot,Dog,Finch,Puffin,Fly,"
    +"Camel,Kiwi,Spider,Lizard,Robin,Bear,Boa,Cow,Crab,Mule,Moth,Lynx,Moose,"+
    "Skunk,Mako,Liger,Llama,Shrimp,Parrot,Pig,Clam,Urchin,Toucan,Frog,Toad,"+
    "Turtle,Viper,Trout,Hare,Bee,Krill,Dodo,Tuna,Loon,Leech,Python,Wasp,Yak,"+
    "Snake,Duck,Worm,Yeti";

  private static final int MAX_RUNCODE_DIGIT = 1000;

  @Autowired
  private PortalService portalService;

  @Autowired
  private RunDao<Run> runDao;

  @Autowired
  private ProjectDao<Project> projectDao;

  @Autowired
  private GroupDao<Group> groupDao;

  @Autowired
  private UserDao<User> userDao;

  @Autowired
  private Properties wiseProperties;

  @Autowired
  protected AclService<Persistable> aclService;

  @Autowired
  private WorkgroupService workgroupService;

  @Autowired
  private ProjectService projectService;

  /**
   * @see RunService#getRunList()
   */
  @Transactional()
  public List<Run> getRunList() {
    // for some reason, runDao.getList returns all runs, when it should
    // only return runs with the right privileges according to Acegi.
    return runDao.getList();
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunListByOwner(User)
   */
  @Transactional()
  public List<Run> getRunListByOwner(User owner) {
    // for some reason, runDao.getList returns all runs, when it should
    // only return runs with the right privileges according to Acegi.
    return runDao.getRunListByOwner(owner);
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunListBySharedOwner(User)
   */
  @Transactional()
  public List<Run> getRunListBySharedOwner(User owner) {
    // for some reason, runDao.getList returns all runs, when it should
    // only return runs with the right privileges according to Acegi.
    return runDao.getRunListBySharedOwner(owner);
  }

  /**
   * @see org.wise.portal.service.run.RunService#getAllRunList()
   */
  @Transactional()
  public List<Run> getAllRunList() {
    return runDao.getList();
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunList(User)
   */
  public List<Run> getRunList(User user) {
    return this.runDao.getRunListByUserInPeriod(user);
  }

  /**
   * Generate a random runcode
   * @param locale
   *
   * @return the randomly generated runcode.
   *
   */
  String generateRunCode(Locale locale) {
    Random rand = new Random();
    Integer digits = rand.nextInt(MAX_RUNCODE_DIGIT);
    StringBuffer sb = new StringBuffer(digits.toString());

    int max_runcode_digit_length = Integer.toString(MAX_RUNCODE_DIGIT)
      .length() - 1;
    while (sb.length() < max_runcode_digit_length) {
      sb.insert(0, "0");
    }
    String language = locale.getLanguage();  // languages is two-letter ISO639 code, like en, es, he, etc.
    // read in runcode prefixes from wise.properties.
    String runcodePrefixesStr = wiseProperties.getProperty("runcode_prefixes_en", DEFAULT_RUNCODE_PREFIXES);
    if (wiseProperties.containsKey("runcode_prefixes_"+language)) {
      runcodePrefixesStr = wiseProperties.getProperty("runcode_prefixes_"+language);
    }
    String[] runcodePrefixes = runcodePrefixesStr.split(",");
    String word = runcodePrefixes[rand.nextInt(runcodePrefixes.length)];
    String runCode = (word + sb.toString());
    return runCode;
  }

  /**
   * Creates a run based on input parameters provided.
   *
   * @param runParameters
   * @return The run created.
   * @throws ObjectNotFoundException
   */
  @Transactional()
  public Run createRun(RunParameters runParameters)
    throws ObjectNotFoundException {
    Project project = runParameters.getProject();
    Run run = new RunImpl();
    run.setEndtime(null);
    run.setStarttime(runParameters.getStartTime());
    run.setRuncode(generateUniqueRunCode(runParameters.getLocale()));
    run.setOwner(runParameters.getOwner());
    run.setMaxWorkgroupSize(runParameters.getMaxWorkgroupSize());
    run.setProject(project);

    //use the project name for the run name
    run.setName("" + runParameters.getProject().getName());

    Calendar reminderCal = Calendar.getInstance();
    reminderCal.add(Calendar.DATE, 30);
    run.setArchiveReminderTime(reminderCal.getTime());
    Set<String> periodNames = runParameters.getPeriodNames();
    if (periodNames != null) {
      Set<Group> periods = new TreeSet<Group>();
      for (String periodName : runParameters.getPeriodNames()) {
        Group group = new PersistentGroup();
        group.setName(periodName);
        this.groupDao.save(group);
        periods.add(group);
      }
      run.setPeriods(periods);
    }
    run.setPostLevel(runParameters.getPostLevel());

    Boolean enableRealTime = runParameters.getEnableRealTime();
    run.setRealTimeEnabled(enableRealTime);

    // set default survey template for this run, if any
    try {
      Portal portal = portalService.getById(new Integer(1));
      String runSurveyTemplate = portal.getRunSurveyTemplate();
      if (runSurveyTemplate != null) {
        run.setSurvey(runSurveyTemplate);
      }
    } catch (Exception e) {
      // it's ok if the code block above fails
    }

    this.runDao.save(run);
    this.aclService.addPermission(run, BasePermission.ADMINISTRATION);
    return run;
  }

  public Run createRun(Integer projectId, User user, Set<String> periodNames,
        Integer studentsPerTeam, Long startDate, Locale locale) throws Exception {
    Project project = projectService.copyProject(projectId, user);
    RunParameters runParameters = createRunParameters(project, user, periodNames,
        studentsPerTeam, startDate, locale);
    Run run = createRun(runParameters);
    createTeacherWorkgroup(run, user);
    return run;
  }

  public RunParameters createRunParameters(Project project, User user, Set<String> periodNames,
        Integer studentsPerTeam, Long startDate, Locale locale) {
    RunParameters runParameters = new RunParameters();
    runParameters.setOwner(user);
    runParameters.setName(project.getName());
    runParameters.setProject(project);
    runParameters.setLocale(locale);
    runParameters.setPostLevel(5);
    runParameters.setPeriodNames(periodNames);
    runParameters.setMaxWorkgroupSize(studentsPerTeam);
    runParameters.setStartTime(new Date(startDate));
    return runParameters;
  }

  private void createTeacherWorkgroup(Run run, User user) throws Exception {
    HashSet<User> members = new HashSet<>();
    members.add(user);
    workgroupService.createWorkgroup("teacher", members, run, null);
  }

  /**
   * @see RunService#addSharedTeacher(AddSharedTeacherParameters)
   */
  public void addSharedTeacher(
    AddSharedTeacherParameters addSharedTeacherParameters) {
    Run run = addSharedTeacherParameters.getRun();
    String sharedOwnerUsername = addSharedTeacherParameters.getSharedOwnerUsername();
    User user = userDao.retrieveByUsername(sharedOwnerUsername);
    run.getSharedowners().add(user);
    this.runDao.save(run);

    Project project = run.getProject();
    project.getSharedowners().add(user);
    this.projectDao.save(project);

    String permission = addSharedTeacherParameters.getPermission();
    if (permission.equals(UserDetailsService.RUN_GRADE_ROLE)) {
      this.aclService.removePermission(run, BasePermission.READ, user);
      this.aclService.removePermission(project, BasePermission.READ, user);
      this.aclService.addPermission(run, BasePermission.WRITE, user);
      this.aclService.addPermission(project, BasePermission.WRITE, user);
    } else if (permission.equals(UserDetailsService.RUN_READ_ROLE)) {
      this.aclService.removePermission(run, BasePermission.WRITE, user);
      this.aclService.removePermission(project, BasePermission.WRITE, user);
      this.aclService.addPermission(run, BasePermission.READ, user);
      this.aclService.addPermission(project, BasePermission.READ, user);
    }
  }

  /**
   * @see RunService#updateSharedTeacherForRun(AddSharedTeacherParameters)
   */
  public void updateSharedTeacherForRun(
    AddSharedTeacherParameters updateSharedTeacherParameters) {
    Run run = updateSharedTeacherParameters.getRun();
    String sharedOwnerUsername = updateSharedTeacherParameters.getSharedOwnerUsername();
    User user = userDao.retrieveByUsername(sharedOwnerUsername);
    if (run.getSharedowners().contains(user)) {
      Project project = run.getProject();
      String permission = updateSharedTeacherParameters.getPermission();
      if (permission.equals(UserDetailsService.RUN_GRADE_ROLE)) {
        this.aclService.removePermission(run, BasePermission.READ, user);
        this.aclService.removePermission(project, BasePermission.READ, user);
        this.aclService.addPermission(run, BasePermission.WRITE, user);
        this.aclService.addPermission(project, BasePermission.WRITE, user);
      } else if (permission.equals(UserDetailsService.RUN_READ_ROLE)) {
        this.aclService.removePermission(run, BasePermission.WRITE, user);
        this.aclService.removePermission(project, BasePermission.WRITE, user);
        this.aclService.addPermission(run, BasePermission.READ, user);
        this.aclService.addPermission(project, BasePermission.READ, user);
      }
    }
  }

  public SharedOwner addSharedTeacher(Long runId, String teacherUsername)
      throws ObjectNotFoundException, TeacherAlreadySharedWithRunException {
    User user = userDao.retrieveByUsername(teacherUsername);
    Run run = this.retrieveById(runId);
    if (!run.getSharedowners().contains(user)) {
      run.getSharedowners().add(user);
      this.runDao.save(run);

      Project project = run.getProject();
      project.getSharedowners().add(user);
      this.projectDao.save(project);

      this.aclService.addPermission(run, RunPermission.VIEW_STUDENT_WORK, user);
      List<Integer> newPermissions = new ArrayList<>();
      newPermissions.add(RunPermission.VIEW_STUDENT_WORK.getMask());
      return new SharedOwner(user.getId(), user.getUserDetails().getUsername(),
        user.getUserDetails().getFirstname(), user.getUserDetails().getLastname(), newPermissions);
    } else {
      throw new TeacherAlreadySharedWithRunException(teacherUsername + " is already shared with this run");
    }
  }

  public void addSharedTeacherPermission(Long runId, Long userId, Integer permissionId) throws ObjectNotFoundException {
    User user = userDao.getById(userId);
    Run run = this.retrieveById(runId);
    if (run.getSharedowners().contains(user)) {
      this.aclService.addPermission(run, new RunPermission(permissionId), user);
    }
  }

  public void removeSharedTeacherPermission(Long runId, Long userId, Integer permissionId)
      throws ObjectNotFoundException {
    User user = userDao.getById(userId);
    Run run = this.retrieveById(runId);
    if (run.getSharedowners().contains(user)) {
      this.aclService.removePermission(run, new RunPermission(permissionId), user);
    }
  }

    /**
     * @see RunService#removeSharedTeacher(String, Long)
     */
  public void removeSharedTeacher(String username, Long runId)
    throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    User user = userDao.retrieveByUsername(username);
    if (run == null || user == null) {
      return;
    }

    if (run.getSharedowners().contains(user)) {
      run.getSharedowners().remove(user);
      this.runDao.save(run);
      Project project = (Project) Hibernate.unproxy(run.getProject());
      project.getSharedowners().remove(user);
      this.projectDao.save(project);

      try {
        List<Permission> runPermissions =
          this.aclService.getPermissions(run, user);
        for (Permission runPermission : runPermissions) {
          this.aclService.removePermission(run, runPermission, user);
        }
        List<Permission> projectPermissions = this.aclService.getPermissions(project, user);
        for (Permission projectPermission : projectPermissions) {
          this.aclService.removePermission(project, projectPermission, user);
        }
      } catch (Exception e) {
        // do nothing. permissions might get be deleted if
        // user requesting the deletion is not the owner of the run.
      }
    }
  }

  /**
   * @see org.wise.portal.service.run.RunService#getSharedTeacherRole(Run, User)
   */
  public String getSharedTeacherRole(Run run, User user) {
    List<Permission> permissions = this.aclService.getPermissions(run, user);
    // for runs, a user can have at most one permission per run
    if (!permissions.isEmpty()) {
      Permission permission = permissions.get(0);
      if (permission.equals(BasePermission.READ)) {
        return UserDetailsService.RUN_READ_ROLE;
      } else if (permission.equals(BasePermission.WRITE)) {
        return UserDetailsService.RUN_GRADE_ROLE;
      }
    }
    return null;
  }

  public List<Permission> getSharedTeacherPermissions(Run run, User sharedTeacher) {
    return this.aclService.getPermissions(run, sharedTeacher);
  }

  private String generateUniqueRunCode(Locale locale) {
    String tempRunCode = generateRunCode(locale);
    while (true) {
      try {
        checkForRunCodeDuplicate(tempRunCode);
      } catch (DuplicateRunCodeException e) {
        tempRunCode = generateRunCode(locale);
        continue;
      }
      break;
    }
    return tempRunCode;
  }

  /**
   * Checks if the given runcode is unique.
   *
   * @param runCode A unique string.
   *
   * @throws DuplicateRunCodeException if the run's runcde
   * already exists in the data store
   */
  private void checkForRunCodeDuplicate(String runCode)
    throws DuplicateRunCodeException {
    try {
      this.runDao.retrieveByRunCode(runCode);
    } catch (ObjectNotFoundException e) {
      return;
    }
    throw new DuplicateRunCodeException("Runcode " + runCode
      + " already exists.");
  }

  /**
   * @see org.wise.portal.service.run.RunService#retrieveRunByRuncode(java.lang.String)
   */
  public Run retrieveRunByRuncode(String runcode)
    throws ObjectNotFoundException {
    return runDao.retrieveByRunCode(runcode);
  }

  /**
   * @see org.wise.portal.service.run.RunService#retrieveById(java.lang.Long)
   */
  public Run retrieveById(Long runId) throws ObjectNotFoundException {
    return runDao.getById(runId);
  }

  /**
   * @see org.wise.portal.service.run.RunService#retrieveById(java.lang.Long)
   */
  public Run retrieveById(Long runId, boolean doEagerFetch) throws ObjectNotFoundException {
    return runDao.getById(runId, doEagerFetch);
  }

  /**
   * @see org.wise.portal.service.run.RunService#endRun(Run)
   */
  @Transactional()
  public void endRun(Run run) {
    if (run.getEndtime() == null) {
      run.setEndtime(Calendar.getInstance().getTime());
      this.runDao.save(run);
    }
  }

  /**
   * @see org.wise.portal.service.run.RunService#startRun(Run)
   */
  @Transactional()
  public void startRun(Run run) {
    if (run.getEndtime() != null) {
      run.setEndtime(null);
      Calendar reminderCal = Calendar.getInstance();
      reminderCal.add(Calendar.DATE, 30);
      run.setArchiveReminderTime(reminderCal.getTime());
      this.runDao.save(run);
    }
  }

  /**
   * @see org.wise.portal.service.run.RunService#getWorkgroups(Long)
   */
  public Set<Workgroup> getWorkgroups(Long runId)
    throws ObjectNotFoundException {
    return this.runDao.getWorkgroupsForRun(runId);
  }

  /**
   * @override @see org.wise.portal.service.run.RunService#getWorkgroups(java.lang.Long, net.sf.sail.webapp.domain.group.Group)
   */
  public Set<Workgroup> getWorkgroups(Long runId, Long periodId)
    throws ObjectNotFoundException {
    return this.runDao.getWorkgroupsForRunAndPeriod(runId, periodId);
  }

  /**
   * @see org.wise.portal.service.run.RunService#addAnnouncementToRun(java.lang.Long, org.wise.portal.domain.announcement.Announcement)
   */
  @Transactional()
  public void addAnnouncementToRun(Long runId, Announcement announcement) throws Exception{
    Run run = this.retrieveById(runId);
    run.getAnnouncements().add(announcement);
    this.runDao.save(run);
  }


  /**
   * @see org.wise.portal.service.run.RunService#removeAnnouncementFromRun(java.lang.Long, org.wise.portal.domain.announcement.Announcement)
   */
  @Transactional()
  public void removeAnnouncementFromRun(Long runId, Announcement announcement) throws Exception{
    Run run = this.retrieveById(runId);
    run.getAnnouncements().remove(announcement);
    this.runDao.save(run);
  }

  @Transactional()
  public void setInfo(Long runId, String isPaused, String showNodeId) throws Exception {
    Run run = this.retrieveById(runId);

    String runInfoString = "<isPaused>" + isPaused + "</isPaused>";
    if (showNodeId != null) {
      runInfoString += "<showNodeId>" + showNodeId + "</showNodeId>";
    }

    /*
     * when we use the info field for more info than just isPaused this
     * will need to be changed so it doesn't just completely overwrite
     * the info field
     */
    run.setInfo(runInfoString);
    this.runDao.save(run);
  }

  /**
   * @see org.wise.portal.service.run.RunService#extendArchiveReminderTime(java.lang.Long)
   */
  @Transactional()
  public void extendArchiveReminderTime(Long runId) throws ObjectNotFoundException{
    Run run = this.retrieveById(runId);

    Calendar moreTime = Calendar.getInstance();
    moreTime.add(Calendar.DATE, 30);

    run.setArchiveReminderTime(moreTime.getTime());
    this.runDao.save(run);
  }

  @Transactional()
  public Integer getProjectUsage(Long id) {
    List<Run> runList = this.runDao.getRunsOfProject(id);
    if (runList == null) {
      return 0;
    } else {
      return runList.size();
    }
  }

  @Transactional()
  public List<Run> getProjectRuns(Long projectId) {
    return this.runDao.getRunsOfProject(projectId);
  }

  @Transactional()
  public void setExtras(Run run, String extras) throws Exception {
    run.setExtras(extras);
    this.runDao.save(run);
  }

  /**
   * @see org.wise.portal.service.run.RunService#hasRunPermission(Run, User, Permission)
   */
  public boolean hasRunPermission(Run run, User user, Permission permission) {
    return this.aclService.hasPermission(run, permission, user);
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunsRunWithinPeriod(java.lang.String)
   */
  public List<Run> getRunsRunWithinPeriod(String period) {
    return this.runDao.getRunsRunWithinPeriod(period);
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunsByActivity()
   */
  public List<Run> getRunsByActivity() {
    return this.runDao.getRunsByActivity();
  }

  /**
   * @see org.wise.portal.service.run.RunService#getRunsByTitle(java.lang.String)
   */
  public List<Run> getRunsByTitle(String runTitle) {
    return this.runDao.retrieveByField("name", "like", "%" + runTitle + "%");
  }

  /**
   * @see org.wise.portal.service.run.RunService#updateRunStatistics(Long)
   */
  @Transactional()
  public void updateRunStatistics(Long runId) {

    try {
      Run run = retrieveById(runId);
      run.setLastRun(Calendar.getInstance().getTime());

      /* increment the number of times this run has been run, if
       * the run has not yet been run, the times run will be null */
      if (run.getTimesRun()==null) {
        run.setTimesRun(1);
      } else {
        run.setTimesRun(run.getTimesRun() + 1);
      }

      this.runDao.save(run);
    } catch (ObjectNotFoundException e) {
      e.printStackTrace();
    }
  }

  /**
   * @see org.wise.portal.service.run.RunService#updateRunName(java.lang.Long, java.lang.String)
   */
  @Transactional()
  public void updateRunName(Long runId, String name) {
    try {
      Run run = this.retrieveById(runId);
      run.setName(name);
      this.runDao.save(run);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }
  }

  @Transactional()
  public void addPeriodToRun(Long runId, String name) {
    try {
      Run run = this.retrieveById(runId);
      Set<Group> periods = run.getPeriods();
      Group group = new PersistentGroup();
      group.setName(name);
      this.groupDao.save(group);
      periods.add(group);
      this.runDao.save(run);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }
  }

  @Transactional()
  public void deletePeriodFromRun(Long runId, String name) {
    try {
      Run run = this.retrieveById(runId);
      Group period = run.getPeriodByName(name);
      Set<Group> periods = run.getPeriods();
      periods.remove(period);
      this.runDao.save(run);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    } catch(PeriodNotFoundException e) {
      e.printStackTrace();
    }
  }

  @Transactional()
  public void setMaxWorkgroupSize(Long runId, Integer studentsPerTeam) {
    try {
      Run run = this.retrieveById(runId);
      run.setMaxWorkgroupSize(studentsPerTeam);
      this.runDao.save(run);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }
  }

  @Transactional()
  public void setStartTime(Long runId, String startTime) {
    try {
      Run run = this.retrieveById(runId);
      run.setStarttime(new Date(startTime));
      this.runDao.save(run);
    } catch(ObjectNotFoundException e) {
      e.printStackTrace();
    }
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#setIdeaManagerEnabled(java.lang.Long, boolean)
   */
  @Transactional
  public void setIdeaManagerEnabled(Long runId, boolean isEnabled) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setIdeaManagerEnabled(isEnabled);
    this.runDao.save(run);
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#setPortfolioEnabled(java.lang.Long, boolean)
   */
  @Transactional
  public void setPortfolioEnabled(Long runId, boolean isEnabled) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setPortfolioEnabled(isEnabled);
    this.runDao.save(run);
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#setStudentAssetUploaderEnabled(java.lang.Long, boolean)
   */
  @Transactional
  public void setStudentAssetUploaderEnabled(Long runId, boolean isEnabled) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setStudentAssetUploaderEnabled(isEnabled);
    this.runDao.save(run);
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#setRealTimeEnabled(java.lang.Long, boolean)
   */
  @Transactional
  public void setRealTimeEnabled(Long runId, boolean isEnabled) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setRealTimeEnabled(isEnabled);
    this.runDao.save(run);
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#updateNotes(Long, String)
   */
  @Transactional
  public void updateNotes(Long runId, String privateNotes) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setPrivateNotes(privateNotes);
    this.runDao.save(run);
  }

  /**
   * @throws ObjectNotFoundException
   * @see org.wise.portal.service.run.RunService#updateSurvey(Long, String)
   */
  @Transactional
  public void updateSurvey(Long runId, String survey) throws ObjectNotFoundException {
    Run run = this.retrieveById(runId);
    run.setSurvey(survey);
    this.runDao.save(run);
  }
}
