!function(n,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.trace=e():n.trace=e()}(this,function(){return function(n){function e(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return n[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}var t={};return e.m=n,e.c=t,e.i=function(n){return n},e.d=function(n,t,r){e.o(n,t)||Object.defineProperty(n,t,{configurable:!1,enumerable:!0,get:r})},e.n=function(n){var t=n&&n.__esModule?function(){return n.default}:function(){return n};return e.d(t,"a",t),t},e.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},e.p="",e(e.s=6)}([function(n,e,t){(function(){var n,e,r={}.hasOwnProperty,i=[].indexOf||function(n){for(var e=0,t=this.length;e<t;e++)if(e in this&&this[e]===n)return e;return-1};n=t(1),e=t(2),this.main=function(t){return function(o,u,l,d){var f,c,a,s,m,_,p,v,h,b,y,g,x,w,j,O,F,k,N,P,q,z,A,M,S,Y,$,C,D,J,B,E,G,H,I;return g=function(n){throw{forbidden:n}},E=function(n){throw{unauthorized:n}},w=function(n){return n in o},x=function(n){return n in u},Y=function(n){if(!w(n))return g("Field `"+n+"` is required.")},G=function(e){if(!n(u[e],o[e]))return g("Field `"+e+"` was modified.")},H=function(n){var e,t,i,u;t=[];for(e in n)r.call(n,e)&&(i=n[e],u=o[e],i(u,o)?t.push(void 0):t.push(g("Field `"+e+"` has invalid value `"+JSON.stringify(u)+"`.")));return t},$=function(n){var e,t;null==n&&(n=[]),t=[];for(e in o)r.call(o,e)&&i.call(n,e)<0&&(x(e)?t.push(void 0):t.push(g("Field `"+e+"` was added.")));return t},D=function(n){var e,t;null==n&&(n=[]),t=[];for(e in u)r.call(u,e)&&i.call(n,e)<0&&(w(e)?t.push(void 0):t.push(g("Field `"+e+"` was removed.")));return t},C=function(n){var e,t;null==n&&(n=[]),t=[];for(e in o)r.call(o,e)&&"_revisions"!==e&&i.call(n,e)<0&&t.push(G(e));return t},O="_"===(null!=(M=o._id)?M[0]:void 0),f=null!=(S=o._id)?S.match(/^(\w+):(.+)$/):void 0,B=null!=f?f[1]:void 0,N=null!=f?f[2]:void 0,I=function(){switch(null!=B&&null!=N||g("`_id` must be <type>:<key>"),o.type!==B&&g("Missing or invalid `type` field."),o[B]!==N&&g("Field `"+B+"` must contain `"+N+"`."),B){case"number":return i.call(N,"@")>=0?"local-number":"global-number";default:return B}},s=l.db,A=l.name,J=l.roles,F=null!=A,m=function(){if(!F)return E("Not logged in.")},v=function(){if(Y("updated_by"),o.updated_by!==A)return g("Field `updated_by` must contain `"+A+"`.")},P=function(n){return i.call(J,n)>=0},j=function(){return P("_admin")},c=d.admins,q=d.members,k=null!=(null!=q?q.names:void 0)&&i.call(q.names,A)>=0,p=function(){if(!k)return E("Not owner.")},h=e(u,o),y=function(){if(o._deleted)return g("You may not delete `"+B+"` documents.")},b=function(){if(null==u||u._deleted)return g("You may not create `"+B+"` documents.")},z=function(){var n,e;return null!=o._id&&(!!P(o._id)||!(!(e=o._id.match(/^(?:number|endpoint):\d+@(\S+)$/))||(n=e[1],!P("number_domain:"+n))))},_=function(){if(!z())return g("Not permitted to modify this record.")},a={doc:o,oldDoc:u,userCtx:l,secObj:d,id:o._id,rev:o._rev,forbidden:g,unauthorized:E,has:w,had:x,required:Y,unchanged:G,validate_fields:H,restrict_adding_fields:$,restrict_removing_fields:D,restrict_modifying_fields:C,is_design:O,type:B,key:N,validate_type:I,db:s,name:A,is_logged_in:F,enforce_logged_in:m,enforce_updated_by:v,roles:J,may:P,is:P,is_admin:j,admins:c,admins_names:null!=c?c.names:void 0,admins_roles:null!=c?c.roles:void 0,members:q,members_names:null!=q?q.names:void 0,members_roles:null!=q?q.roles:void 0,is_owner:k,enforce_ownership:p,event:h,forbid_deletion:y,forbid_creation:b,might:z,enforce_might:_},t.call(a,a)}}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t;return(t=function(n,e){var r,i,o,u,l,d,f,c;if(n===e)return!0;if(typeof n!=typeof e)return!1;if(null==n||"object"!=typeof n)return!1;if(null==e||"object"!=typeof e)return!1;if(n instanceof Array&&!(e instanceof Array))return!1;if(u=Object.keys(n),l=Object.keys(e),u.length!==l.length)return!1;for(u.sort(),l.sort(),r=i=0,d=u.length;i<d;r=++i)if((c=u[r])!==l[r])return!1;for(o=0,f=u.length;o<f;o++)if(c=u[o],!t(n[c],e[c]))return!1;return!0})(n,e)}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t,r;return r=[null,null,"create","tombstone",null,null,null,null,null,null,"modify","delete",null,null,"create",null],t=0,(null!=e?e._deleted:void 0)&&(t+=1),null!=e&&(t+=2),(null!=n?n._deleted:void 0)&&(t+=4),null!=n&&(t+=8),r[t]}}).call(this)},,,,function(n,e,t){"use strict";var r;r=t(0),n.exports.validate_user_doc=r.main(function(){if(!this.is_admin())return this.forbid_deletion()})}])});