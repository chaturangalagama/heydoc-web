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

@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
  
  // private refreshTokenInProgress = false;
  // cachedRequests: Array<HttpRequest<any>> = [];

  constructor(private router: Router, private injector: Injector, private authService: AuthService, private alertService : AlertService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const access_token = localStorage.getItem('access_token');
    if (access_token && !request.url.includes("token")) 
        request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } });
    return next.handle(request).pipe(
      tap(
        (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
          }
        },
        (error: any) => {
          if (error instanceof HttpErrorResponse) {
            // if(error.message['error'] == "invalid_token"){
            //   // this.collectFailedRequest(request);
            // }
            if (request.url.includes("token") || error.status !== (401 || 403)) {
              this.alertService.error(JSON.stringify(error));
            }
            // if (this.refreshTokenInProgress) {
            //   return null;
            // } 
            else {
                // this.refreshTokenInProgress = true;
                return this.authService.refreshToken().subscribe(resp => {
                  // this.refreshTokenInProgress = false;
                  this.storeNewAuthenticationToken(resp);
                  // this.retryFailedRequests();
                  //////////////////////

                  //////////////////////
                },
                (error: any) => {
                    // this.refreshTokenInProgress = false;
                    this.authService.logout();
                    this.alertService.error(JSON.stringify(error));
                });
            }
          }
        }
      )
    );
  }

  
storeNewAuthenticationToken(resp) {
  localStorage.setItem('access_token', null);
  localStorage.setItem('refresh_token', null);
  localStorage.setItem('user_details', null);
  localStorage.setItem('access_token', resp.body['access_token']);
  localStorage.setItem('refresh_token', resp.body['refresh_token']);
  localStorage.setItem('user_details', JSON.stringify(resp.body['user_details']));
}

// public collectFailedRequest(request): void {
//   this.cachedRequests.push(request);
// }

// public retryFailedRequests(): void {
//   // this.intercept(this.cachedRequests[0], null);
//   // retry the requests. this method can be called after the token is refreshed
//   const access_token = localStorage.getItem('access_token');
//   this.cachedRequests.forEach(request => 
//     request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } })
//     );
//     // return next.handle(req).pipe(

//     // )
// }

//////////////////////////////////////////////


}