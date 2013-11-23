package org.wise.portal.dao.status;

import java.util.List;

import org.wise.vle.domain.status.StudentStatus;

import net.sf.sail.webapp.dao.SimpleDao;

public interface StudentStatusDao<T extends StudentStatus> extends SimpleDao<StudentStatus> {

	public StudentStatus getStudentStatusById(Long id);
	
	public void saveStudentStatus(StudentStatus studentStatus);
	
	public StudentStatus getStudentStatusByWorkgroupId(Long workgroupId);
	
	public List<StudentStatus> getStudentStatusesByPeriodId(Long periodId);
	
	public List<StudentStatus> getStudentStatusesByRunId(Long runId);
}
