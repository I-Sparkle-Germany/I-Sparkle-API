package org.wise.portal.presentation.web.controllers.user;

import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.verify;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.Map;

import org.easymock.TestSubject;
import org.junit.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.wise.portal.presentation.web.exception.InvalidPasswordException;

public class GoogleUserAPIControllerTest extends UserAPIControllerTest {

  @TestSubject
  private GoogleUserAPIController controller = new GoogleUserAPIController();

  @Test
  public void isGoogleIdExist_GoogleUserExists_ReturnTrue() {
    expect(userService.retrieveUserByGoogleUserId(STUDENT1_GOOGLE_ID)).andReturn(student1);
    replay(userService);
    assertTrue(controller.isGoogleIdExist(STUDENT1_GOOGLE_ID));
    verify(userService);
  }

  @Test
  public void isGoogleIdExist_InvalidGoogleUserId_ReturnFalse() {
    String invalidGoogleId = "google-id-not-exists-in-db";
    expect(userService.retrieveUserByGoogleUserId(invalidGoogleId)).andReturn(null);
    replay(userService);
    assertFalse(controller.isGoogleIdExist(invalidGoogleId));
    verify(userService);
  }

  @Test
  public void isGoogleIdMatches_GoogleUserIdAndUserIdMatch_ReturnTrue() {
    expect(userService.retrieveUserByGoogleUserId(STUDENT1_GOOGLE_ID)).andReturn(student1);
    replay(userService);
    assertTrue(controller.isGoogleIdMatches(STUDENT1_GOOGLE_ID, student1Id.toString()));
    verify(userService);
  }

  @Test
  public void isGoogleIdMatches_InvalidGoogleUserId_ReturnFalse() {
    String invalidGoogleId = "google-id-not-exists-in-db";
    expect(userService.retrieveUserByGoogleUserId(invalidGoogleId)).andReturn(null);
    replay(userService);
    assertFalse(controller.isGoogleIdMatches(invalidGoogleId, student1Id.toString()));
    verify(userService);
  }

  @Test
  public void isGoogleIdMatches_GoogleUserIdAndUserIdDoNotMatch_ReturnFalse() {
    expect(userService.retrieveUserByGoogleUserId(STUDENT1_GOOGLE_ID)).andReturn(teacher1);
    replay(userService);
    assertFalse(controller.isGoogleIdMatches(STUDENT1_GOOGLE_ID, teacher1.toString()));
    verify(userService);
  }

  @Test
  public void getUserByGoogleId_GoogleUserExists_ReturnSuccessResponse() {
    expect(userService.retrieveUserByGoogleUserId(STUDENT1_GOOGLE_ID)).andReturn(student1);
    replay(userService);
    HashMap<String, Object> response = controller.getUserByGoogleId(STUDENT1_GOOGLE_ID);
    assertEquals("success", response.get("status"));
    assertEquals(student1.getId(), response.get("userId"));
    verify(userService);
  }

  @Test
  public void getUserByGoogleId_InvalidGoogleUserId_ReturnErrorResponse() {
    String invalidGoogleId = "google-id-not-exists-in-db";
    expect(userService.retrieveUserByGoogleUserId(invalidGoogleId)).andReturn(null);
    replay(userService);
    HashMap<String, Object> response = controller.getUserByGoogleId(invalidGoogleId);
    assertEquals("error", response.get("status"));
    verify(userService);
  }

  @Test
  public void unlinkGoogleAccount_InvalidPasswordLength_ReturnError() {
    String newPassword = "1234567";
    expect(passwordService.isValidLength(newPassword)).andReturn(false);
    replay(passwordService);
    ResponseEntity<Map<String, Object>> response = controller.unlinkGoogleAccount(studentAuth,
        newPassword);
    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertEquals("invalidPasswordLength", response.getBody().get("messageCode"));
    verify(passwordService);
  }

  @Test
  public void unlinkGoogleAccount_InvalidPasswordPattern_ReturnError() {
    String newPassword = "abcd1234";
    expect(passwordService.isValidLength(newPassword)).andReturn(true);
    expect(passwordService.isValidPattern(newPassword)).andReturn(false);
    replay(passwordService);
    ResponseEntity<Map<String, Object>> response = controller.unlinkGoogleAccount(studentAuth,
        newPassword);
    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertEquals("invalidPasswordPattern", response.getBody().get("messageCode"));
    verify(passwordService);
  }

  @Test
  public void unlinkGoogleAccount_ValidNewPassword_ReturnUpdatedUserMap()
      throws InvalidPasswordException {
    String newPassword = "Abcd1234";
    expect(passwordService.isValidLength(newPassword)).andReturn(true);
    expect(passwordService.isValidPattern(newPassword)).andReturn(true);
    assertTrue(student1.getUserDetails().isGoogleUser());
    expect(userService.retrieveUserByUsername(STUDENT_USERNAME)).andReturn(student1).times(2);
    expect(userService.updateUserPassword(student1, newPassword)).andReturn(student1);
    expect(appProperties.getProperty("send_email_enabled", "false")).andReturn("false");
    replay(appProperties, passwordService, userService);
    controller.unlinkGoogleAccount(studentAuth, newPassword);
    verify(appProperties, passwordService, userService);
  }
}
