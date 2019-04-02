exports.cdr=function(n){var e={};function t(r){if(e[r])return e[r].exports;var i=e[r]={i:r,l:!1,exports:{}};return n[r].call(i.exports,i,i.exports,t),i.l=!0,i.exports}return t.m=n,t.c=e,t.d=function(n,e,r){t.o(n,e)||Object.defineProperty(n,e,{enumerable:!0,get:r})},t.r=function(n){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})},t.t=function(n,e){if(1&e&&(n=t(n)),8&e)return n;if(4&e&&"object"==typeof n&&n&&n.__esModule)return n;var r=Object.create(null);if(t.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:n}),2&e&&"string"!=typeof n)for(var i in n)t.d(r,i,function(e){return n[e]}.bind(null,i));return r},t.n=function(n){var e=n&&n.__esModule?function(){return n.default}:function(){return n};return t.d(e,"a",e),e},t.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},t.p="",t(t.s=5)}([function(n,e,t){(function(){var e,r,i,u={}.hasOwnProperty,l=[].indexOf||function(n){for(var e=0,t=this.length;e<t;e++)if(e in this&&this[e]===n)return e;return-1};e=t(1),i=t(2),r=function(n){return function(t,r,o,d){var f,a,c,s,m,_,v,p,b,h,y,g,O,j,w,x,F,S,P,M,k,N,q,z,A,T,Y,$,C,D,E,J,B,G,H,I,K;return g=function(n){throw{forbidden:n}},J=function(n){throw{unauthorized:n}},j=function(n){return n in t},O=function(n){return n in r},T=function(n){if(!j(n))return g("Field `"+n+"` is required.")},B=function(n){if(!e(r[n],t[n]))return g("Field `"+n+"` was modified.")},H=function(n){var e,r,i;for(e in r=[],n)u.call(n,e)&&((0,n[e])(i=t[e],t)?r.push(void 0):r.push(g("Field `"+e+"` has invalid value `"+JSON.stringify(i)+"`.")));return r},Y=function(n){var e,r;for(e in null==n&&(n=[]),r=[],t)u.call(t,e)&&l.call(n,e)<0&&(O(e)?r.push(void 0):r.push(g("Field `"+e+"` was added.")));return r},C=function(n){var e,t;for(e in null==n&&(n=[]),t=[],r)u.call(r,e)&&l.call(n,e)<0&&(j(e)?t.push(void 0):t.push(g("Field `"+e+"` was removed.")));return t},$=function(n){var e,r;for(e in null==n&&(n=[]),r=[],t)u.call(t,e)&&"_revisions"!==e&&l.call(n,e)<0&&r.push(B(e));return r},x="_"===(null!=(z=t._id)?z[0]:void 0),K=this,G=function(n){n.forEach(function(n){return n.call(K,t,r,o,d)})},f=null!=(A=t._id)?A.match(/^(\w+):(.+)$/):void 0,E=null!=f?f[1]:void 0,P=null!=f?f[2]:void 0,I=function(){switch(null!=E&&null!=P||g("`_id` must be <type>:<key>"),t.type!==E&&g("Missing or invalid `type` field."),t[E]!==P&&g("Field `"+E+"` must contain `"+P+"`."),E){case"number":return l.call(P,"@")>=0?"local-number":"global-number";default:return E}},s=o.db,q=o.name,D=o.roles,F=null!=q,m=function(){if(!F)return J("Not logged in.")},p=function(){if(T("updated_by"),t.updated_by!==q)return g("Field `updated_by` must contain `"+q+"`.")},M=function(n){return l.call(D,n)>=0},w=function(){return M("_admin")},a=d.admins,k=d.members,S=null!=(null!=k?k.names:void 0)&&l.call(k.names,q)>=0,v=function(){if(!S)return J("Not owner.")},b=i(r,t),y=function(){if(t._deleted)return g("You may not delete `"+E+"` documents.")},h=function(){if(null==r||r._deleted)return g("You may not create `"+E+"` documents.")},N=function(){var n,e;return null!=t._id&&(!!M(t._id)||!(!(e=t._id.match(/^(?:number|endpoint):\d+@(\S+)$/))||(n=e[1],!M("number_domain:"+n))))},_=function(){if(!N())return g("Not permitted to modify this record.")},c={doc:t,oldDoc:r,userCtx:o,secObj:d,id:t._id,rev:t._rev,forbidden:g,unauthorized:J,has:j,had:O,required:T,unchanged:B,validate_fields:H,restrict_adding_fields:Y,restrict_removing_fields:C,restrict_modifying_fields:$,is_design:x,validate:G,type:E,key:P,validate_type:I,db:s,name:q,is_logged_in:F,enforce_logged_in:m,enforce_updated_by:p,roles:D,may:M,is:M,is_admin:w,admins:a,admins_names:null!=a?a.names:void 0,admins_roles:null!=a?a.roles:void 0,members:k,members_names:null!=k?k.names:void 0,members_roles:null!=k?k.roles:void 0,is_owner:S,enforce_ownership:v,event:b,forbid_deletion:y,forbid_creation:h,might:N,enforce_might:_},n.call(c,c)}},n.exports={main:r}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t;return(t=function(n,e){var r,i,u,l,o,d,f,a;if(n===e)return!0;if(typeof n!=typeof e)return!1;if(null==n||"object"!=typeof n)return!1;if(null==e||"object"!=typeof e)return!1;if(n instanceof Array&&!(e instanceof Array))return!1;if(l=Object.keys(n),o=Object.keys(e),l.length!==o.length)return!1;for(l.sort(),o.sort(),r=i=0,d=l.length;i<d;r=++i)if((a=l[r])!==o[r])return!1;for(u=0,f=l.length;u<f;u++)if(a=l[u],!t(n[a],e[a]))return!1;return!0})(n,e)}}).call(this)},function(n,e){(function(){n.exports=function(n,e){var t,r;return r=[null,null,"create","tombstone",null,null,null,null,null,null,"modify","delete",null,null,"create",null],t=0,(null!=e?e._deleted:void 0)&&(t+=1),null!=e&&(t+=2),(null!=n?n._deleted:void 0)&&(t+=4),null!=n&&(t+=8),r[t]}}).call(this)},,,function(n,e,t){(function(){var e;e=t(0),n.exports.validate_user_doc=e.main(function(){if(!this.is_admin())return this.forbid_deletion()})}).call(this)}]);