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
package org.wise.portal.service.tag.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.dao.project.TagDao;
import org.wise.portal.domain.project.Tag;
import org.wise.portal.domain.project.impl.TagImpl;
import org.wise.portal.service.tag.TagService;

/**
 * @author Patrick Lawler
 */
@Service
public class TagServiceImpl implements TagService {

  @Autowired
  private TagDao<Tag> tagDao;

  @Transactional(readOnly = true)
  public Tag getTagById(Integer id) {
    try{
      return tagDao.getById(id);
    } catch (ObjectNotFoundException e) {
      e.printStackTrace();
      return null;
    }
  }

  @Transactional
  public Tag createOrGetTag(String name) {
    Tag tag = tagDao.getTagByName(name);
    if (tag == null) {
      tag = new TagImpl();
      tag.setName(name.toLowerCase());
      tagDao.save(tag);
    }
    return tag;
  }

  public boolean isFromDatabase(Tag tag) {
    if (tag.getId() == null) {
      return false;
    } else {
      return true;
    }
  }

  @Transactional
  public void removeIfOrphaned(Integer tagId) {
    tagDao.removeIfOrphaned(tagId);
  }
}
