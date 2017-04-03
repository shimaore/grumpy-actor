!function(n,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.reference=e():n.reference=e()}(this,function(){return function(n){function e(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return n[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}var t={};return e.m=n,e.c=t,e.i=function(n){return n},e.d=function(n,t,r){e.o(n,t)||Object.defineProperty(n,t,{configurable:!1,enumerable:!0,get:r})},e.n=function(n){var t=n&&n.__esModule?function(){return n.default}:function(){return n};return e.d(t,"a",t),t},e.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},e.p="",e(e.s=5)}([function(n,e,t){(function(){var n,e,r={}.hasOwnProperty,i=[].indexOf||function(n){for(var e=0,t=this.length;e<t;e++)if(e in this&&this[e]===n)return e;return-1};n=t(1),e=t(2),this.main=function(t){return function(l,u,o,s){var a,c,d,f,m,_,p,h,v,g,b,y,w,x,j,O,F,N,k,z,P,q,A,M,S,Y,$,C,D,I,J,B,E,G,H;return y=function(n){throw{forbidden:n}},B=function(n){throw{unauthorized:n}},x=function(n){return n in l},w=function(n){return n in u},Y=function(n){if(!x(n))return y("Field `"+n+"` is required.")},E=function(e){if(!n(u[e],l[e]))return y("Field `"+e+"` was modified.")},G=function(n){var e,t,i,u;t=[];for(e in n)r.call(n,e)&&(i=n[e],u=l[e],i(u,l)?t.push(void 0):t.push(y("Field `"+e+"` has invalid value `"+JSON.stringify(u)+"`.")));return t},$=function(n){var e,t;null==n&&(n=[]),t=[];for(e in l)r.call(l,e)&&i.call(n,e)<0&&(w(e)?t.push(void 0):t.push(y("Field `"+e+"` was added.")));return t},D=function(n){var e,t;null==n&&(n=[]),t=[];for(e in u)r.call(u,e)&&i.call(n,e)<0&&(x(e)?t.push(void 0):t.push(y("Field `"+e+"` was removed.")));return t},C=function(n){var e,t;null==n&&(n=[]),t=[];for(e in l)r.call(l,e)&&"_revisions"!==e&&i.call(n,e)<0&&t.push(E(e));return t},O="_"===(null!=(M=l._id)?M[0]:void 0),a=null!=(S=l._id)?S.match(/^(\w+):(.+)$/):void 0,J=null!=a?a[1]:void 0,k=null!=a?a[2]:void 0,H=function(){switch(null!=J&&null!=k||y("`_id` must be <type>:<key>"),l.type!==J&&y("Missing or invalid `type` field."),l[J]!==k&&y("Field `"+J+"` must contain `"+k+"`."),J){case"number":return i.call(k,"@")>=0?"local-number":"global-number";default:return J}},f=o.db,A=o.name,I=o.roles,F=null!=A,m=function(){if(!F)return B("Not logged in.")},h=function(){if(Y("updated_by"),l.updated_by!==A)return y("Field `updated_by` must contain `"+A+"`.")},z=function(n){return i.call(I,n)>=0},j=function(){return z("_admin")},c=s.admins,P=s.members,N=null!=(null!=P?P.names:void 0)&&i.call(P.names,A)>=0,p=function(){if(!N)return B("Not owner.")},v=e(u,l),b=function(){if(l._deleted)return y("You may not delete `"+J+"` documents.")},g=function(){if(null==u||u._deleted)return y("You may not create `"+J+"` documents.")},q=function(){var n,e;return null!=l._id&&(!!z(l._id)||!(!(e=l._id.match(/^(?:number|endpoint):\d+@(\S+)$/))||(n=e[1],!z("number_domain:"+n))))},_=function(){if(!q())return y("Not permitted to modify this record.")},d={doc:l,oldDoc:u,userCtx:o,secObj:s,id:l._id,rev:l._rev,forbidden:y,unauthorized:B,has:x,had:w,required:Y,unchanged:E,validate_fields:G,restrict_adding_fields:$,restrict_removing_fields:D,restrict_modifying_fields:C,is_design:O,type:J,key:k,validate_type:H,db:f,name:A,is_logged_in:F,enforce_logged_in:m,enforce_updated_by:h,roles:I,may:z,is:z,is_admin:j,admins:c,admins_names:null!=c?c.names:void 0,admins_roles:null!=c?c.roles:void 0,members:P,members_names:null!=P?P.names:void 0,members_roles:null!=P?P.roles:void 0,is_owner:N,enforce_ownership:p,event:v,forbid_deletion:b,forbid_creation:g,might:q,enforce_might:_},t.call(d,d)}}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t;return(t=function(n,e){var r,i,l,u,o,s,a,c;if(n===e)return!0;if(typeof n!=typeof e)return!1;if(null==n||"object"!=typeof n)return!1;if(null==e||"object"!=typeof e)return!1;if(n instanceof Array&&!(e instanceof Array))return!1;if(u=Object.keys(n),o=Object.keys(e),u.length!==o.length)return!1;for(u.sort(),o.sort(),r=i=0,s=u.length;i<s;r=++i)if((c=u[r])!==o[r])return!1;for(l=0,a=u.length;l<a;l++)if(c=u[l],!t(n[c],e[c]))return!1;return!0})(n,e)}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t,r;return r=[null,null,"create","tombstone",null,null,null,null,null,null,"modify","delete",null,null,"create",null],t=0,(null!=e?e._deleted:void 0)&&(t+=1),null!=e&&(t+=2),(null!=n?n._deleted:void 0)&&(t+=4),null!=n&&(t+=8),r[t]}}).call(this)},,,function(n,e,t){"use strict";var r,i,l=[].indexOf||function(n){for(var e=0,t=this.length;e<t;e++)if(e in this&&this[e]===n)return e;return-1};i=t(0),n.exports.validate_user_doc=i.main(function(){if(!this.is_admin())return this.forbid_deletion()}),r=function(n,e){return n+e},n.exports.tags=function(n){var e,t,i,u,o,s,a,c,d,f,m,_,p,h,v,g,b;if(null!=n.tags&&null!=n.calls&&!(l.call(n.tags,"emergency")>=0||l.call(n.tags,"client-side")<0)){for(i=n.calls.map(function(n){var e,t;return e=parseInt(null!=(t=n.report)?t.billable:void 0),isNaN(e)?0:e/1e3}).reduce(r,0),f=n.tags.filter(function(n){return n.match(/:/)}),e=l.call(n.tags,"answered")>=0,c=l.call(n.tags,"ingress")>=0,u=l.call(n.tags,"egress")>=0,b=function(){switch(!1){case!(c&&e):return"ingress-answered";case!c:return"ingress-unanswered";case!u:return"egress";default:return"other"}}(),g=null!=(_=null!=(p=n.calls[0])?p.tz_start_time:void 0)?_:null!=(h=n.calls[0])?h.start_time:void 0,t=g.slice(0,10),v=[],s=0,m=f.length;s<m;s++)d=f[s],a=d.split(":"),o=a.concat([t,b]),v.push(emit(o,i));return v}}}])});