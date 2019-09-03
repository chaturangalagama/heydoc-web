import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject, throwError } from 'rxjs';
import { tap, switchMap, take, filter, catchError } from 'rxjs/operators';
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
export class RefreshTokenInterceptor4 implements HttpInterceptor {

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(public authService: AuthService, private alertService : AlertService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (!request.url.includes("token") && localStorage.getItem('access_token')) {
      request = this.addToken(request, localStorage.getItem('access_token'));
    }

    return next.handle(request).pipe(catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return this.handle401Error(request, next);
      } else {
        return throwError(error);
      }
    }));
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((resp: any) => {
          this.storeNewAuthenticationToken(resp);
          this.isRefreshing = false;
          this.refreshTokenSubject.next(localStorage.getItem('access_token'));
          return next.handle(this.addToken(request, localStorage.getItem('access_token')));
        }),        
        catchError(error => {
          this.authService.logout();
          this.alertService.error(JSON.stringify(error));
          return throwError(error);
        })
        );

    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => {
          return next.handle(this.addToken(request, jwt));
        }));
    }
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