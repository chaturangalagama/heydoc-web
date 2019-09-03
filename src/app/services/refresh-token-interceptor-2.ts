import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject, from, observable } from 'rxjs';
import { tap, switchMap, take, filter } from 'rxjs/operators';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse, HttpHeaders, HttpSentEvent, HttpHeaderResponse, HttpProgressEvent, HttpUserEvent } from '@angular/common/http';
import { AuthService } from './auth.service';
import { AlertService } from './alert.service';

@Injectable()
export class RefreshTokenInterceptor2 implements HttpInterceptor {
  
  // isRefreshingToken: boolean = false;
  // tokenSubject: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  constructor(private router: Router, private injector: Injector, private authService: AuthService, private alertService : AlertService) {}

  // addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
  //   return req.clone({ setHeaders: { Authorization: 'Bearer ' + token }})
  // }

  // intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  //       const authService = this.injector.get(AuthService);

  //       return next.handle(this.addToken(req, authService.getAuthToken())).pipe(
  //           (error => {
  //               if (error instanceof HttpErrorResponse) {
  //                   switch ((<HttpErrorResponse>error).status) {
  //                       case 401:
  //                           return this.handle401Error(req, next);
  //                       default:
  //                         observable.throw(error);
  //                   }
  //               } else {
  //                 returnObservable.throw(error);
  //                   return observable.throw(error);
  //               }
  //           }));
  //   }

  //   handle401Error(req: HttpRequest<any>, next: HttpHandler) {
  //       if (!this.isRefreshingToken) {
  //           this.isRefreshingToken = true;

  //           // Reset here so that the following requests wait until the token
  //           // comes back from the refreshToken call.
  //           this.tokenSubject.next(null);

  //           const authService = this.injector.get(AuthService);
            
            // return authService.refreshToken().pipe(
            //     switchMap((newToken: string) => {
            //         if (newToken) {
            //             this.tokenSubject.next(newToken);
            //             return next.handle(this.addToken(this.getNewRequest(req), newToken));
            //         }

            //         // If we don't get a new token, we are in trouble so logout.
            //         return this.logoutUser();
            //     }),
            //     catchError(error => {
            //         // If there is an exception calling 'refreshToken', bad news so logout.
            //         return this.logoutUser();
            //     }),
            //     finalize(() => {
            //         this.isRefreshingToken = false;
            //     }),);
  //       } else {
  //           return this.tokenSubject.pipe(
  //               filter(token => token != null),
  //               take(1),
  //               switchMap(token => {
  //                   return next.handle(this.addToken(this.getNewRequest(req), token));
  //               }),);
  //       }
  //   }

  //   /*
  //       This method is only here so the example works.
  //       Do not include in your code, just use 'req' instead of 'this.getNewRequest(req)'.
  //   */
  //   getNewRequest(req: HttpRequest<any>): HttpRequest<any> {
  //       if (req.url.indexOf('getData') > 0) {
  //           return new HttpRequest('GET', 'http://private-4002d-testerrorresponses.apiary-mock.com/getData');
  //       }

  //       return new HttpRequest('GET', 'http://private-4002d-testerrorresponses.apiary-mock.com/getLookup');
  //   }

  //   logoutUser() {
  //       // Route to the login page (implementation up to you)

  //       this.alertService.error(JSON.stringify(error));
  //   }

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
            if (request.url.includes("token") || error.status !== (401 || 403)) {
              this.alertService.error(JSON.stringify(error));
            }
            else {              
              return this.authService.refreshToken().subscribe(
                  (resp: any) => {
                      this.storeNewAuthenticationToken(resp);
                      return next.handle(                        
                        this.addToken(request, localStorage.getItem('access_token'))
                        )
                        .subscribe(
                          (resp: any) => {console.log(resp)})
                },
                (error: any) => {
                    return null;
                });

            }
          }
        }
      )
    );
  }
  addToken(request, access_token){
       return request = request.clone({ setHeaders: { Authorization: `Bearer ${access_token}` ,'Content-Type': 'application/json' } });
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