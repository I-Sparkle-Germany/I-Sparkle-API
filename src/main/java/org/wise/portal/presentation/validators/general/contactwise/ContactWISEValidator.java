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
package org.wise.portal.presentation.validators.general.contactwise;

import java.util.regex.Pattern;

import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.ValidationUtils;
import org.springframework.validation.Validator;
import org.wise.portal.domain.general.contactwise.impl.ContactWISEForm;

/**
 * Validator for TELS Contact WISE page
 *
 * @author Hiroki Terashima
 * @author Geoffrey Kwan
 */
@Component
public class ContactWISEValidator implements Validator {

  private static final String EMAIL_REGEXP =
      "^[a-zA-Z0-9]+([_\\.-][a-zA-Z0-9]+)*@" +
      "([a-zA-Z0-9]+([\\.-][a-zA-Z0-9]+)*)+\\.[a-zA-Z]{2,}$";

  @SuppressWarnings("unchecked")
  public boolean supports(Class clazz) {
    return ContactWISEForm.class.isAssignableFrom(clazz);
  }

  public void validate(Object contactWISEIn, Errors errors) {
    ContactWISEForm contactWISE = (ContactWISEForm) contactWISEIn;

    // NOTE: this check may be removed later if we never allow students to submit feedback
    Boolean isStudent = contactWISE.getIsStudent();
    ValidationUtils.rejectIfEmptyOrWhitespace(errors, "name", "error.contactwise-name");

    if (!isStudent) {
      ValidationUtils.rejectIfEmptyOrWhitespace(errors, "email",  "error.contactwise-email-empty");
    }

    ValidationUtils.rejectIfEmptyOrWhitespace(errors, "summary",  "error.contactwise-summary");

    ValidationUtils.rejectIfEmptyOrWhitespace(errors, "description",
        "error.contactwise-description");

    String email = contactWISE.getEmail();

    if (!isStudent && email != null && !email.trim().equals("")) {
      validateEmail(email, errors);
    }
  }

  private void validateEmail(String email, Errors errors) {
    if (email != null && !Pattern.matches(EMAIL_REGEXP, email)) {
      errors.rejectValue("email", "error.email-invalid");
    }
  }
}
