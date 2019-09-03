import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { tap, switchMap, take, filter } from 'rxjs/operators';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { AuthService } from './auth.service';
import { AlertService } from './alert.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable()
export class RefreshTokenInterceptor3 implements HttpInterceptor {

  private startTime = Date.now();
  constructor(private router: Router, private injector: Injector, public jwtHelper: JwtHelperService, private authService: AuthService, private alertService : AlertService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // if(localStorage.getItem('access_token') === null)
    //   this.startTime = Date.now();
    if (!request.url.includes("token")){
      const access_token = localStorage.getItem('access_token');
      // if (access_token == null || access_token == "null") 
      //   return null;
      const remainTime = this.jwtHelper.getTokenExpirationDate().getSeconds()*1000 + this.startTime - Date.now();
      console.log('Start Time',this.startTime);
      console.log('Remaining Time',remainTime);
      console.log('Token Expiry',this.jwtHelper.getTokenExpirationDate().getSeconds()*1000);
      console.log('Current Time',Date.now());

      if(remainTime < 0){
        this.authService.refreshToken().subscribe(resp => {
          this.startTime = Date.now();
          this.storeNewAuthenticationToken(resp);
          request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } });          
          return next.handle(request);
        },
        (error: any) => {
            this.authService.logout();
            // this.alertService.error(JSON.stringify(error));
        });
      }
      else{
        if (access_token && !request.url.includes("token")) 
            request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } });
            return next.handle(request);
      }
    }
    else{
          // request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } });
          return next.handle(request);
    }
    // return next.handle(request).pipe(
    //   tap(
    //     (event: HttpEvent<any>) => {
    //       if (event instanceof HttpResponse) {
    //       }
    //     },
    //     (error: any) => {
    //       // if (error instanceof HttpErrorResponse) {
    //       //   if (request.url.includes("token") || error.status !== (401 || 403)) {
    //       //     this.alertService.error(JSON.stringify(error));
    //       //   }
    //       //   else {
    //       //       return this.authService.refreshToken().subscribe(resp => {
    //       //         this.storeNewAuthenticationToken(resp);
    //       //       },
    //       //       (error: any) => {
    //       //           this.authService.logout();
    //       //           this.alertService.error(JSON.stringify(error));
    //       //       });
    //       //   }
    //       // }
    //     }
    //   )
    // );
  }

  storeNewAuthenticationToken(resp) {
    localStorage.setItem('access_token', null);
    localStorage.setItem('refresh_token', null);
    localStorage.setItem('user_details', null);
    localStorage.setItem('access_token', resp.body['access_token']);
    localStorage.setItem('refresh_token', resp.body['refresh_token']);
    localStorage.setItem('user_details', JSON.stringify(resp.body['user_details']));
  }

}