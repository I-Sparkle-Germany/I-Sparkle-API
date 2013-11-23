package org.wise.portal.dao.crater;

import java.util.List;

import org.wise.vle.domain.cRater.CRaterRequest;
import org.wise.vle.domain.work.StepWork;

import net.sf.sail.webapp.dao.SimpleDao;

public interface CRaterRequestDao<T extends CRaterRequest> extends SimpleDao<CRaterRequest> {

	public CRaterRequest getCRaterRequestById(Long id);
	
	public void saveCRaterRequest(CRaterRequest cRaterRequest);
	
	public CRaterRequest getCRaterRequestByStepWorkIdNodeStateId(StepWork stepWork, Long nodeStateId);
	
	public List<CRaterRequest> getIncompleteCRaterRequests();
}
