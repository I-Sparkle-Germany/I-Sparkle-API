/**
 * Copyright (c) 2008-2019 Regents of the University of California (Regents).
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
package org.wise.portal.presentation.web.filters;

import java.io.IOException;
import java.util.Map;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.jwt.Jwt;
import org.springframework.security.jwt.JwtHelper;
import org.springframework.security.oauth2.client.OAuth2RestTemplate;
import org.springframework.security.oauth2.common.OAuth2AccessToken;
import org.wise.portal.domain.authentication.MutableUserDetails;
import org.wise.portal.service.session.SessionService;

public class GoogleOpenIdConnectFilter extends AbstractOpenIdConnectFilter {

  @Autowired
  protected SessionService sessionService;

  public GoogleOpenIdConnectFilter(String defaultFilterProcessesUrl) {
    super(defaultFilterProcessesUrl);
  }

  @Override
  public Authentication attemptAuthentication(HttpServletRequest request,
      HttpServletResponse response) throws AuthenticationException, IOException {
    saveRequestParams(request);
    OAuth2AccessToken accessToken = getAccessToken();
    try {
      final String idToken = accessToken.getAdditionalInformation().get("id_token").toString();
      String kid = JwtHelper.headers(idToken).get("kid");
      final Jwt tokenDecoded = JwtHelper.decodeAndVerify(idToken, verifier(kid));
      final Map<String, String> authInfo = new ObjectMapper().readValue(tokenDecoded.getClaims(),
          Map.class);
      verifyClaims(authInfo);
      final UserDetails user = userDetailsService.loadUserByGoogleUserId(authInfo.get("sub"));
      invalidateAccesToken();
      if (user != null) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
      } else {
        throw new BadCredentialsException("google user not found");
      }
    } catch (final Exception e) {
      throw new BadCredentialsException("Could not obtain user details from token", e);
    }
  }

  private void invalidateAccesToken() {
    openIdRestTemplate.getOAuth2ClientContext().setAccessToken((OAuth2AccessToken) null);
  }

  @Override
  protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain, Authentication authentication) throws IOException, ServletException {
    UserDetails userDetails = (UserDetails) authentication.getPrincipal();
    sessionService.addSignedInUser(userDetails);
    userDetailsService.updateStatsOnSuccessfulLogin((MutableUserDetails) userDetails);
    super.successfulAuthentication(request, response, chain, authentication);
  }

  @Value("${google.clientId:}")
  protected void setClientId(String clientId) {
    this.clientId = clientId;
  }

  @Value("${google.issuer:}")
  protected void setIssuer(String issuer) {
    this.issuer = issuer;
  }

  @Value("${google.jwkUrl:}")
  protected void setJwkUrl(String jwkUrl) {
    this.jwkUrl = jwkUrl;
  }

  @Autowired
  @Qualifier("googleOpenIdRestTemplate")
  protected void setOpenIdRestTemplate(OAuth2RestTemplate template) {
    this.openIdRestTemplate = template;
  }
}
