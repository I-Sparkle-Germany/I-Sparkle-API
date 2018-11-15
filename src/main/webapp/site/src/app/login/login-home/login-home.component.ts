import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

import { UserService } from '../../services/user.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-login',
  templateUrl: './login-home.component.html',
  styleUrls: ['./login-home.component.scss']
})
export class LoginHomeComponent implements OnInit {

  credentials: any = {username: '', password: ''};
  error: boolean = false;
  processing: boolean = false;
  isGoogleAuthenticationEnabled: boolean = false;
  isShowGoogleLogin: boolean = true;

  constructor(private userService: UserService, private http: HttpClient,
      private router: Router, private route: ActivatedRoute,
      private configService: ConfigService) {
  }

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config) => {
      if (config != null) {
        this.isGoogleAuthenticationEnabled = config.googleClientId != null;
      }
    });
    this.route.params.subscribe(params => {
      if (params['username'] != null) {
        this.credentials.username = params['username'];
        this.isShowGoogleLogin = false;
      }
    });
  }
  
  login(): boolean {
    this.processing = true;
    this.error = false;
    this.userService.authenticate(this.credentials, () => {
      if (this.userService.isAuthenticated) {
        this.router.navigateByUrl(this.userService.getRedirectUrl());
      } else {
        this.error = true;
        this.processing = false;
      }
    });
    return false;
  }

  public socialSignIn(socialPlatform : string) {
    window.location.href = `${this.configService.getContextPath()}/google-login`;
  }
}
