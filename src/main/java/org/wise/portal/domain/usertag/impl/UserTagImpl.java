package org.wise.portal.domain.usertag.impl;

import java.util.HashMap;
import java.util.Map;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Transient;

import org.wise.portal.domain.user.User;
import org.wise.portal.domain.user.impl.UserImpl;
import org.wise.portal.domain.usertag.UserTag;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = UserTagImpl.DATA_STORE_NAME)
@Getter
@Setter
public class UserTagImpl implements UserTag {

  @Transient
  public static final long serialVersionUID = 1L;

  @Transient
  public static final String DATA_STORE_NAME = "user_tags";

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  private Long id = null;

  @ManyToOne(targetEntity = UserImpl.class, fetch = FetchType.LAZY)
  @JoinColumn(name = "users_fk", nullable = false)
  @JsonIgnore
  private User user;

  @Column(name = "text")
  private String text;

  @Column(name = "color")
  private String color;

  public UserTagImpl() {
  }

  public UserTagImpl(User user, String text, String color) {
    this.user = user;
    this.text = text;
    this.color = color;
  }

  public Map<String, Object> toMap() {
    Map<String, Object> map = new HashMap<>();
    map.put("id", this.id);
    map.put("text", this.text);
    map.put("color", this.color);
    return map;
  }
}