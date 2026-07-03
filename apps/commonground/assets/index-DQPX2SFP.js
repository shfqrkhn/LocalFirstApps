(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`commonground-suite`,t=`workspaces`,n=`matters`,r=`participants`,i=`intakeRecords`,a=`issueNodes`,o=`sessions`,s=`commitments`,c=`followUps`,l=`exportArtifacts`,u=[{fromVersion:0,toVersion:1,description:`Initial schema — creates all 9 core object stores with indexes`,migrate:e=>{console.info(`[Migration] Creating schema v1 stores...`);let u=[{name:t,keyPath:`id`},{name:n,keyPath:`id`,indexes:[{name:`workspaceId`,keyPath:`workspaceId`},{name:`status`,keyPath:`status`},{name:`type`,keyPath:`type`}]},{name:r,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`}]},{name:i,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`,unique:!0}]},{name:a,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`},{name:`priority`,keyPath:`priority`}]},{name:o,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`}]},{name:s,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`},{name:`status`,keyPath:`status`}]},{name:c,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`}]},{name:l,keyPath:`id`,indexes:[{name:`matterId`,keyPath:`matterId`}]}];for(let t of u)if(!e.objectStoreNames.contains(t.name)){console.debug(`[Migration] Creating store: ${t.name}`);let n=e.createObjectStore(t.name,{keyPath:t.keyPath});n.createIndex(`createdAt`,`createdAt`),n.createIndex(`updatedAt`,`updatedAt`),n.createIndex(`schemaVersion`,`schemaVersion`);for(let e of t.indexes??[])n.createIndex(e.name,e.keyPath,{unique:e.unique??!1})}}},{fromVersion:1,toVersion:2,description:`Per-participant intake: remove unique matterId constraint, add participantId index`,migrate:(e,tx)=>{console.info(`[Migration] Updating intakeRecords for per-participant intake...`);let s=tx.objectStore(i);s.deleteIndex(`matterId`);s.createIndex(`matterId`,`matterId`);s.createIndex(`participantId`,`participantId`)}}],d=null,f=null;async function p(){return d||f||(f=new Promise((t,n)=>{if(console.info(`[DB] Opening ${e} (v2)...`),!self.indexedDB){n(Error(`IndexedDB not supported in this environment`));return}let r=indexedDB.open(e,2);r.onupgradeneeded=e=>{let t=r.result,n=e.oldVersion,i=e.newVersion||n;console.info(`[DB] Upgrade needed: ${n} -> ${i}`);let a=u.filter(e=>e.fromVersion>=n&&e.toVersion<=i).sort((e,t)=>e.fromVersion-t.fromVersion);for(let e of a){console.group(`[Migration] v${e.fromVersion} -> v${e.toVersion}`),console.info(`Description: ${e.description}`);try{e.migrate(t,r.transaction),console.info(`[Migration] APPLIED`)}catch(e){throw console.error(`[Migration] CRITICAL FAILURE — Upgrading Aborted:`,e?.message||"Unknown error"),console.groupEnd(),e}console.groupEnd()}},r.onsuccess=()=>{let e=r.result;e.onversionchange=()=>{console.warn(`[DB] Version change detected elsewhere. Closing connection.`),e.close(),d=null,f=null},d=e,f=null,t(e)},r.onerror=()=>{f=null,console.error(`[DB] Open failed:`,r.error?.message||"Unknown error"),n(Error(`Failed to open IndexedDB: ${r.error?.message||`Unknown error`}`))},r.onblocked=()=>{console.warn(`[DB] Database upgrade blocked! Close other instances of COMMONGROUND Suite.`)}}),f)}async function m(){d&&(d.close(),d=null,f=null),await new Promise((t,n)=>{let r=indexedDB.deleteDatabase(e);r.onsuccess=()=>t(),r.onerror=()=>n(Error(`Failed to delete database`))})}function h(e){return new Promise((t,n)=>{e.onsuccess=()=>t(e.result),e.onerror=()=>n(e.error)})}function g(){return new Date().toISOString()}async function _(e,t){return(await p()).transaction(e,t).objectStore(e)}function v(e){return{async get(t){return h((await _(e,`readonly`)).get(t))},async getAll(){return h((await _(e,`readonly`)).getAll())},async getAllByIndex(t,n){return h((await _(e,`readonly`)).index(t).getAll(n))},async add(t){let n=await _(e,`readwrite`),r={...t,createdAt:t.createdAt||g(),updatedAt:g()};return await h(n.add(r)),r},async put(t){let n=await _(e,`readwrite`),r={...t,updatedAt:g()};return await h(n.put(r)),r},async update(t,n){let r=await _(e,`readwrite`),i=await h(r.get(t));if(!i)throw Error(`Record ${t} not found in ${e}`);let a={...i,...n,updatedAt:g()};return await h(r.put(a)),a},async delete(t){await h((await _(e,`readwrite`)).delete(t))},async count(){return h((await _(e,`readonly`)).count())},async bulkAdd(t){let n=(await p()).transaction(e,`readwrite`),r=n.objectStore(e),i=t.map(e=>({...e,createdAt:e.createdAt||g(),updatedAt:g()}));for(let e of i)r.add(e);return await new Promise((e,t)=>{n.oncomplete=()=>e(),n.onerror=()=>t(n.error)}),i},async deleteByIndex(t,n){let r=(await p()).transaction(e,`readwrite`),i=await h(r.objectStore(e).index(t).getAllKeys(n));for(let t of i)r.objectStore(e).delete(t);return await new Promise((e,t)=>{r.oncomplete=()=>e(),r.onerror=()=>t(r.error)}),i.length}}}function y(){return crypto.randomUUID()}function ee(){return new Date().toISOString()}function b(){let e=ee();return{id:y(),createdAt:e,updatedAt:e,schemaVersion:1}}var te=v(t);async function ne(e,t){let n={...b(),name:e,owner:t,settings:{defaultVisibility:`facilitator`}};return te.add(n)}async function re(){return te.getAll()}var ie=v(n);async function x(e,t,n=`conflict-resolution`){let r={...b(),workspaceId:e,title:t,type:n,status:`draft`,suitabilityState:`pending`,currentPhase:`preparation`};return ie.add(r)}async function S(e){return ie.get(e)}async function C(e){return ie.getAllByIndex(`workspaceId`,e)}async function ae(e,t){return ie.update(e,t)}async function oe(e){await ie.delete(e)}var se=v(r);async function ce(e,t,n=`party`){let r={...b(),matterId:e,displayName:t,role:n,consent:{processConsent:!1,recordConsent:!1,shareConsent:!1},visibility:`facilitator`};return se.add(r)}async function w(e){return se.getAllByIndex(`matterId`,e)}async function le(e,t,n,r){return se.update(e,{consent:{processConsent:t,recordConsent:n,shareConsent:r,consentTimestamp:new Date().toISOString()},updatedAt:new Date().toISOString()})}var ue=v(i);function de(e,t=2e3){return e.trim().slice(0,t)}function fe(e){let t={};for(let[n,r]of Object.entries(e))typeof r==`boolean`?t[n]=r:typeof r==`string`?t[n]=de(r):Array.isArray(r)&&(t[n]=r.map(e=>String(e).trim()).filter(Boolean));return t}function pe(e){return e.map(e=>({category:e.category,triggered:!!e.triggered,note:e.note?de(e.note,500):void 0}))}async function me(e,p){let r=await ue.getAllByIndex(`matterId`,e);return p!==void 0?r.find(t=>t.participantId===p)??null:r[0]??null}async function he(e){let t=await me(e.matterId,e.participantId),n={participantId:e.participantId,source:e.source,responses:fe(e.responses),riskFlags:pe(e.riskFlags),visibility:e.visibility};if(t)return ue.update(t.id,n);let r={...b(),matterId:e.matterId,...n};return ue.add(r)}var ge=v(a);function _e(e,t=1e3){return e.trim().slice(0,t)}async function ve(e,t,n,r=`medium`){let i={...b(),matterId:e,label:_e(t,120),notes:_e(n),priority:r,visibility:`facilitator`};return ge.add(i)}async function T(e){return ge.getAllByIndex(`matterId`,e)}async function ye(e,t){let n={...t,label:t.label?_e(t.label,120):t.label,notes:t.notes?_e(t.notes):t.notes};return ge.update(e,n)}async function be(e,t){return ge.update(e,{priority:t})}async function xe(e){await ge.delete(e)}var Se=v(o);function Ce(e,t=2e3){return e.trim().slice(0,t)}async function we(e){let t={...b(),matterId:e.matterId,date:ee(),phase:e.phase,agenda:e.agenda.map(e=>Ce(e,240)).filter(Boolean),notes:Ce(e.notes),participantIds:e.participantIds,visibility:e.visibility??`facilitator`};return Se.add(t)}async function E(e){return Se.getAllByIndex(`matterId`,e)}async function Te(e){await Se.delete(e)}var Ee=v(s);function De(e,t=600){return e.trim().slice(0,t)}async function Oe(e){let t={...b(),matterId:e.matterId,ownerId:e.ownerId,sessionId:e.sessionId,text:De(e.text),dueDate:e.dueDate,status:`pending`,visibility:e.visibility??`facilitator`};return Ee.add(t)}async function D(e){return Ee.getAllByIndex(`matterId`,e)}async function ke(e,t){return Ee.update(e,{status:t})}async function Ae(e){await Ee.delete(e)}var je=v(c);function Me(e,t=1e3){return e.trim().slice(0,t)}async function Ne(e,t){let n={...b(),matterId:e,targetDate:t};return je.add(n)}async function O(e){return je.getAllByIndex(`matterId`,e)}async function Pe(e,t){return je.update(e,{result:Me(t),completedAt:ee()})}async function Fe(e){await je.delete(e)}var Ie={critical:0,high:1,medium:2,low:3};function Le(e){return e.split(`-`).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(` `)}async function Re(e){let t=await S(e);if(!t)throw Error(`Matter not found for negotiation pack.`);let[n,r,i,a,o,s]=await Promise.all([w(e),me(e),T(e),E(e),D(e),O(e)]),c=[...i].sort((e,t)=>Ie[e.priority]-Ie[t.priority]),l=[...a].sort((e,t)=>t.date.localeCompare(e.date)).slice(0,2),u=o.filter(e=>e.status!==`complete`&&e.status!==`cancelled`).length,d=s.filter(e=>!e.completedAt).length,f=`Capture one concrete commitment with an owner and due date.`;return c.length===0?f=`Map at least one issue to focus the first negotiation session.`:a.length===0?f=`Run an initial session and record agenda notes.`:d===0&&(f=`Schedule a follow-up date to verify outcome progress.`),{matterId:e,generatedAt:new Date().toISOString(),summary:{matterTitle:t.title,matterType:Le(t.type),participantCount:n.length,sessionCount:a.length},readiness:{suitabilityState:t.suitabilityState,intakePresent:!!r,openCommitments:u,openFollowUps:d},keyIssues:c.slice(0,5).map(e=>({label:e.label,priority:e.priority,notes:e.notes})),recentAgendaHighlights:l.flatMap(e=>e.agenda).filter(Boolean).slice(0,6),nextAction:f}}function ze(e,t,n){return Math.max(t,Math.min(n,e))}async function Be(e){let t=await S(e);if(!t)throw Error(`Matter not found for team health pack.`);let[n,r,i,a,o]=await Promise.all([w(e),T(e),E(e),D(e),O(e)]),s=r.filter(e=>e.priority===`critical`).length,c=r.filter(e=>e.priority===`high`).length,l=a.filter(e=>e.status!==`complete`&&e.status!==`cancelled`).length,u=a.filter(e=>e.status===`complete`).length,d=o.filter(e=>!e.completedAt).length,f=100;f-=Math.min(s*10,30),f-=Math.min(c*5,20),i.length===0&&(f-=10),u>0&&u>=l&&(f+=10),f=ze(f,0,100);let p=`Review this team health snapshot with participants and confirm priorities.`;return i.length===0?p=`Run a team health session and capture agenda + notes.`:s>0||c>1?p=`Address the top blockers and define one owner per blocker.`:l>0?p=`Close open commitments before creating new action items.`:d===0&&(p=`Schedule a follow-up checkpoint to keep team momentum.`),{matterId:e,generatedAt:new Date().toISOString(),summary:{matterTitle:t.title,participantCount:n.length,sessionCount:i.length,collaborationPulse:f},signals:{criticalIssues:s,highIssues:c,openCommitments:l,completedCommitments:u,openFollowUps:d},focusAreas:r.sort((e,t)=>{let n={critical:0,high:1,medium:2,low:3};return n[e.priority]-n[t.priority]}).slice(0,5).map(e=>e.label),recentWins:a.filter(e=>e.status===`complete`).slice(0,3).map(e=>e.text),nextAction:p}}var Ve={critical:0,high:1,medium:2,low:3};function He(e,t,n){return Math.max(t,Math.min(n,e))}function Ue(){return new Date().toISOString().slice(0,10)}async function We(e){let t=await S(e);if(!t)throw Error(`Matter not found for performance conversation pack.`);let[n,r,i,a,o,s]=await Promise.all([w(e),me(e),T(e),E(e),D(e),O(e)]),c=i.filter(e=>e.priority===`critical`).length,l=i.filter(e=>e.priority===`high`).length,u=o.filter(e=>e.status!==`complete`&&e.status!==`cancelled`).length,d=o.filter(e=>e.dueDate&&e.dueDate<Ue()&&e.status!==`complete`&&e.status!==`cancelled`).length,f=s.filter(e=>!e.completedAt).length,p=80;r||(p-=20),a.length===0&&(p-=15),p-=Math.min(c*12,24),p-=Math.min(l*6,18),p-=Math.min(d*8,24),p=He(p,0,100);let m=`Review this snapshot together and confirm one clear goal for the next check-in.`;return r?i.length===0?m=`Map at least one topic so the conversation stays specific and actionable.`:d>0?m=`Address overdue commitments first and reset realistic due dates.`:f===0&&(m=`Schedule a follow-up date now to maintain accountability.`):m=`Capture intake context first so the conversation starts from shared facts.`,{matterId:e,generatedAt:new Date().toISOString(),summary:{matterTitle:t.title,participantCount:n.length,sessionCount:a.length,conversationReadiness:p},signals:{intakePresent:!!r,criticalTopics:c,highTopics:l,openCommitments:u,overdueCommitments:d,openFollowUps:f},priorityTopics:i.sort((e,t)=>Ve[e.priority]-Ve[t.priority]).slice(0,5).map(e=>({label:e.label,priority:e.priority})),strengths:o.filter(e=>e.status===`complete`).slice(0,3).map(e=>e.text),nextAction:m}}var Ge={critical:0,high:1,medium:2,low:3};function Ke(e,t,n){return Math.max(t,Math.min(n,e))}async function qe(e){let t=await S(e);if(!t)throw Error(`Matter not found for change facilitation pack.`);let[n,r,i,a,o,s]=await Promise.all([w(e),me(e),T(e),E(e),D(e),O(e)]),c=i.filter(e=>e.priority===`critical`).length,l=i.filter(e=>e.priority===`high`).length,u=o.filter(e=>e.status!==`complete`&&e.status!==`cancelled`).length,d=o.filter(e=>e.status===`complete`).length,f=s.filter(e=>!e.completedAt).length,p=85;r||(p-=15),a.length===0&&(p-=10),p-=Math.min(c*12,24),p-=Math.min(l*6,18),d>0&&d>=u&&(p+=8),p=Ke(p,0,100);let m=`Review this change snapshot with stakeholders and confirm immediate priorities.`;return r?i.length===0?m=`Map key change risks and dependencies before execution.`:c>0?m=`Address critical risks first with one owner and deadline per risk.`:f===0&&(m=`Schedule a follow-up checkpoint to monitor adoption progress.`):m=`Capture intake context so the change scope and constraints are explicit.`,{matterId:e,generatedAt:new Date().toISOString(),summary:{matterTitle:t.title,participantCount:n.length,sessionCount:a.length,changeReadiness:p},signals:{intakePresent:!!r,criticalRisks:c,highRisks:l,openCommitments:u,completedCommitments:d,openFollowUps:f},topRisks:i.sort((e,t)=>Ge[e.priority]-Ge[t.priority]).slice(0,5).map(e=>({label:e.label,priority:e.priority})),progressSignals:o.filter(e=>e.status===`complete`).slice(0,3).map(e=>e.text),nextAction:m}}var Je=`commonground`;async function Ye(){return(await navigator.storage.getDirectory()).getDirectoryHandle(Je,{create:!0})}async function Xe(e,t){let n=await(await(await Ye()).getFileHandle(e,{create:!0})).createWritable(),r=typeof t==`string`?new TextEncoder().encode(t):t;return await n.write(r.buffer),await n.close(),`${Je}/${e}`}var Ze=1;async function Qe(e){let t={...e,exportVersion:Ze,schemaVersion:1,exportedAt:ee()},n=JSON.stringify(t,null,2),r=`matter-${e.matterId}-${Date.now()}.json`;await Xe(r,n);let i=await tt(n);return{filename:r,sizeBytes:new TextEncoder().encode(n).byteLength,checksum:i,bundle:t}}function $e(e){return JSON.stringify(e,null,2)}function et(e,t){let n=new Blob([t],{type:`application/json`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=e,i.click(),URL.revokeObjectURL(r)}async function tt(e){let t=new TextEncoder().encode(e),n=await crypto.subtle.digest(`SHA-256`,t);return Array.from(new Uint8Array(n)).map(e=>e.toString(16).padStart(2,`0`)).join(``)}var nt=v(n),rt=v(r),it=v(i),at=v(a),ot=v(o),st=v(s),ct=v(c),lt=v(l);async function ut(e){let t=await nt.get(e);if(!t)throw Error(`Matter not found for export.`);let n=await rt.getAllByIndex(`matterId`,e),r=await it.getAllByIndex(`matterId`,e),i=await at.getAllByIndex(`matterId`,e),a=await ot.getAllByIndex(`matterId`,e),o=await st.getAllByIndex(`matterId`,e),s=await ct.getAllByIndex(`matterId`,e),c=await lt.getAllByIndex(`matterId`,e),l=await Qe({matterId:e,matter:t,participants:n,intakeRecord:r[0],intakeRecords:r,issueNodes:i,sessions:a,commitments:o,followUps:s,exportArtifacts:c});return et(l.filename,$e(l.bundle)),{filename:l.filename,checksum:l.checksum,sizeBytes:l.sizeBytes}}var dt=[`q2`,`q3`,`q4`,`q6`];function ft(e,t,n){let r=dt.some(t=>!e[t]),i=Object.values(e).some(e=>e===!1),a=n.trim();if(r&&t!==`routed-out`)throw Error(`Critical safety checks failed. Outcome must be "Not Suitable (Route-Out)".`);if(t===`suitable`&&i)throw Error(`A "Suitable" outcome requires all checklist answers to be "Yes".`);if(t===`routed-out`&&a.length===0)throw Error(`Route-Out requires rationale notes to support safe referral handling.`);return{checklist:{voluntary:e.q1,authorityToSettle:e.q9,powerImbalance:e.q2?`none`:`severe`,safetyRisk:e.q4?`none`:`high`,notes:a},requiresRouteOut:r}}var pt=v(r),mt=v(i),ht=v(a),gt=v(o),_t=v(s),vt=v(c),yt=v(l);async function bt(e){await Promise.all([pt.deleteByIndex(`matterId`,e),mt.deleteByIndex(`matterId`,e),ht.deleteByIndex(`matterId`,e),gt.deleteByIndex(`matterId`,e),_t.deleteByIndex(`matterId`,e),vt.deleteByIndex(`matterId`,e),yt.deleteByIndex(`matterId`,e)]),await oe(e)}var xt=25*1024*1024,St=[1],Ct=[1];function wt(e){return typeof e==`string`&&e.trim().length>0}function Tt(e){let t=new Set,n=new Set;for(let r of e)t.has(r.id)?n.add(r.id):t.add(r.id);return[...n]}function Et(e){let t=[],n=[];if(new TextEncoder().encode(e).byteLength>26214400)return{status:`malformed`,errors:[`Import file exceeds the ${(xt/(1024*1024)).toFixed(0)} MB limit.`],warnings:n};let r;try{r=JSON.parse(e)}catch{return{status:`malformed`,errors:[`File is not valid JSON.`],warnings:n}}if(typeof r!=`object`||!r)return{status:`malformed`,errors:[`Top-level value is not an object.`],warnings:n};let i=r,a=Array.isArray(i.participants)?i.participants:[],o=Array.isArray(i.sessions)?i.sessions:[],s=Array.isArray(i.commitments)?i.commitments:[],c=Array.isArray(i.issueNodes)?i.issueNodes:[],l=Array.isArray(i.followUps)?i.followUps:[],u=Array.isArray(i.exportArtifacts)?i.exportArtifacts:[];St.includes(i.exportVersion)||t.push(`Unsupported exportVersion: ${i.exportVersion}`),Ct.includes(i.schemaVersion)||t.push(`Unsupported schemaVersion: ${i.schemaVersion}`),i.schemaVersion&&i.schemaVersion>1&&t.push(`Bundle was exported from a newer version of the app. Please update COMMONGROUND Suite.`),i.matterId||t.push(`Missing matterId.`),i.matter||t.push(`Missing matter record.`),wt(i.matter?.id)||t.push(`Matter record is missing a valid id.`),i.matterId&&i.matter?.id&&i.matterId!==i.matter.id&&t.push(`matterId does not match matter.id.`),i.exportedAt||t.push(`Missing exportedAt timestamp.`),i.exportedAt&&Number.isNaN(Date.parse(i.exportedAt))&&t.push(`exportedAt must be a valid ISO timestamp.`),i.participants!==void 0&&!Array.isArray(i.participants)&&t.push(`participants must be an array.`),i.sessions!==void 0&&!Array.isArray(i.sessions)&&t.push(`sessions must be an array.`),i.commitments!==void 0&&!Array.isArray(i.commitments)&&t.push(`commitments must be an array.`),i.issueNodes!==void 0&&!Array.isArray(i.issueNodes)&&t.push(`issueNodes must be an array.`),i.followUps!==void 0&&!Array.isArray(i.followUps)&&t.push(`followUps must be an array.`),i.exportArtifacts!==void 0&&!Array.isArray(i.exportArtifacts)&&t.push(`exportArtifacts must be an array.`),Array.isArray(i.participants)||n.push(`No participants array found.`),Array.isArray(i.sessions)||n.push(`No sessions array found.`),Array.isArray(i.commitments)||n.push(`No commitments array found.`),Array.isArray(i.issueNodes)||n.push(`No issue nodes array found.`),Array.isArray(i.followUps)||n.push(`No follow-ups array found.`);let d=new Set(a.map(e=>e.id)),f=new Set(o.map(e=>e.id)),p=new Set(c.map(e=>e.id)),m=i.matter?.id;for(let e of Tt(a))t.push(`Duplicate participant id detected: ${e}.`);for(let e of Tt(o))t.push(`Duplicate session id detected: ${e}.`);for(let e of Tt(s))t.push(`Duplicate commitment id detected: ${e}.`);for(let e of Tt(c))t.push(`Duplicate issue id detected: ${e}.`);for(let e of Tt(l))t.push(`Duplicate follow-up id detected: ${e}.`);for(let e of Tt(u))t.push(`Duplicate export artifact id detected: ${e}.`);for(let e of a)m&&e.matterId!==m&&t.push(`Participant ${e.id} has mismatched matterId ${e.matterId}.`);for(let e of c)m&&e.matterId!==m&&t.push(`Issue ${e.id} has mismatched matterId ${e.matterId}.`);for(let e of o)m&&e.matterId!==m&&t.push(`Session ${e.id} has mismatched matterId ${e.matterId}.`);for(let e of s)m&&e.matterId!==m&&t.push(`Commitment ${e.id} has mismatched matterId ${e.matterId}.`);for(let e of l)m&&e.matterId!==m&&t.push(`Follow-up ${e.id} has mismatched matterId ${e.matterId}.`);for(let e of u)m&&e.matterId!==m&&t.push(`Export artifact ${e.id} has mismatched matterId ${e.matterId}.`);i.intakeRecord&&m&&i.intakeRecord.matterId!==m&&t.push(`Intake record has mismatched matterId ${i.intakeRecord.matterId}.`),i.intakeRecord&&!d.has(i.intakeRecord.participantId)&&t.push(`Intake record participant is not present in participants list.`);if(Array.isArray(i.intakeRecords)){let _seenPids=new Set,_seenIds=new Set;for(let rec of i.intakeRecords){_seenIds.has(rec.id)&&t.push(`Duplicate intake record id detected: ${rec.id}.`);_seenIds.add(rec.id);rec.participantId&&_seenPids.has(rec.participantId)&&t.push(`Duplicate intake record for participant ${rec.participantId}.`);rec.participantId&&_seenPids.add(rec.participantId);m&&rec.matterId!==m&&t.push(`Intake record has mismatched matterId ${rec.matterId}.`);!d.has(rec.participantId)&&t.push(`Intake record references unknown participant ${rec.participantId??("(none)")}.`)}}for(let e of o){if(!Array.isArray(e.participantIds)){t.push(`Session ${e.id} has invalid participantIds (must be an array).`);continue}for(let n of e.participantIds)d.has(n)||t.push(`Session ${e.id} references unknown participant ${n}.`)}for(let e of s)d.has(e.ownerId)||t.push(`Commitment ${e.id} references unknown owner ${e.ownerId}.`),e.sessionId&&!f.has(e.sessionId)&&t.push(`Commitment ${e.id} references unknown session ${e.sessionId}.`);for(let e of c)e.parentId&&!p.has(e.parentId)&&t.push(`Issue ${e.id} references unknown parent issue ${e.parentId}.`);return t.length>0?{status:t.some(e=>e.includes(`Unsupported`)||e.includes(`newer version`))?`incompatible-version`:`schema-mismatch`,errors:t,warnings:n}:{status:`valid`,errors:t,warnings:n,bundle:i}}function Dt(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(r.result),r.onerror=()=>n(Error(`Failed to read file`)),r.readAsText(e)})}function k(e){let t=ee();return{...e,createdAt:t,updatedAt:t,schemaVersion:1}}async function Ot(e,t){let u=Et(JSON.stringify(e));if(u.status!==`valid`)throw Error(`Import blocked: ${u.errors.join(`; `)}`);let d=(await p()).transaction([n,r,i,a,o,s,c,l],`readwrite`),f=d.objectStore(n),m=d.objectStore(r),h=d.objectStore(i),g=d.objectStore(a),_=d.objectStore(o),v=d.objectStore(s),ee=d.objectStore(c),b=d.objectStore(l),te=new Map([[e.matter.id,y()]]),ne=new Map,re=new Map,ie=new Map,x=te.get(e.matter.id),S=k({...e.matter,id:x,workspaceId:t,title:`${e.matter.title} (Imported)`});f.add(S);for(let t of e.participants??[]){let e=y();ne.set(t.id,e);let n=k({...t,id:e,matterId:x});m.add(n)}for(let rec of(Array.isArray(e.intakeRecords)?e.intakeRecords:e.intakeRecord?[e.intakeRecord]:[])){let t=ne.get(rec.participantId);if(!t)throw Error(`Import blocked: intake participant could not be remapped.`);let n=k({...rec,id:y(),matterId:x,participantId:t});h.add(n)}for(let t of e.issueNodes??[]){let e=y();re.set(t.id,e)}for(let t of e.issueNodes??[]){let e=k({...t,id:re.get(t.id),matterId:x,parentId:t.parentId?re.get(t.parentId):void 0});g.add(e)}for(let t of e.sessions??[]){let e=y();if(ie.set(t.id,e),!Array.isArray(t.participantIds))throw Error(`Import blocked: session ${t.id} has invalid participantIds.`);let n=t.participantIds.map(e=>{let t=ne.get(e);if(!t)throw Error(`Import blocked: session participant ${e} could not be remapped.`);return t}),r=k({...t,id:e,matterId:x,participantIds:n});_.add(r)}for(let t of e.commitments??[]){let e=ne.get(t.ownerId);if(!e)throw Error(`Import blocked: commitment owner ${t.ownerId} could not be remapped.`);let n=t.sessionId?ie.get(t.sessionId):void 0;if(t.sessionId&&!n)throw Error(`Import blocked: commitment session ${t.sessionId} could not be remapped.`);let r=k({...t,id:y(),matterId:x,ownerId:e,sessionId:n});v.add(r)}for(let t of e.followUps??[]){let e=k({...t,id:y(),matterId:x});ee.add(e)}for(let t of e.exportArtifacts??[]){let e=k({...t,id:y(),matterId:x});b.add(e)}return await new Promise((e,t)=>{d.oncomplete=()=>e(),d.onerror=()=>t(d.error??Error(`Import transaction failed.`)),d.onabort=()=>t(d.error??Error(`Import transaction aborted.`))}),{matterId:S.id,matterTitle:S.title}}var kt=[`preparation`,`introduction`,`info-exchange`,`interest-discovery`,`option-generation`,`evaluation`,`agreement`];function At(e){return e.followUpCount>0?`agreement`:e.commitmentCount>0?`evaluation`:e.sessionCount>0?e.latestSessionPhase??`option-generation`:e.issueCount>0?`interest-discovery`:e.hasIntake?`info-exchange`:e.suitabilityState===`pending`?`preparation`:`introduction`}function jt(e){return e.suitabilityState===`routed-out`?`closed`:e.followUpCount>0?`follow-up`:e.hasIntake||e.issueCount>0||e.sessionCount>0||e.commitmentCount>0?`active`:e.suitabilityState===`pending`?`draft`:`intake`}function Mt(e,t){let n=kt.indexOf(e);return kt.indexOf(t)>n?t:e}var Nt=`dashboard`,Pt=`v0.1.130`,A=null,j=[],M=null,N=[],P=null,F=[],I=[],L=[],R=[],z=null,B=null,V=null,H=null,U={workspaceName:80,facilitatorName:80,matterTitle:120,participantName:80,issueLabel:120,issueNotes:3e3,suitabilityNotes:3e3,intakeNotes:4e3,intakeDesiredOutcome:4e3,intakeConstraints:4e3,intakeRiskNote:500,sessionAgenda:3e3,sessionNotes:6e3,commitmentText:500,followupResult:4e3},Ft=null,It=null,Lt=null,W=`all`,G=null;function Rt(){M=null,N=[],P=null,F=[],I=[],L=[],R=[],z=null,B=null,V=null,H=null}function K(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function zt(e,t=`unknown`){return/^[a-z0-9-]+$/i.test(e)?e.toLowerCase():t}function q(e){let t=K(e);return`<span class="help-tip" tabindex="0" data-tip="${t}" aria-label="Help: ${t}">?</span>`}function J(e,t,n){Ft={tone:t,message:n},Bt(e),It!==null&&window.clearTimeout(It),t!==`error`&&(It=window.setTimeout(()=>{Ft=null,Bt(e),It=null},6e3))}function Y(){let e=document.activeElement;e instanceof HTMLElement&&(Lt=e)}function X(e,t,n){return e.length>t?`${n} must be ${t} characters or fewer.`:null}function Bt(e){let t=e.querySelector(`#global-notice`);if(!t)return;if(!Ft){t.hidden=!0,t.textContent=``,t.className=`global-notice`,t.setAttribute(`role`,`status`),t.setAttribute(`aria-live`,`polite`);return}t.hidden=!1,t.textContent=Ft.message;let n=Ft.tone===`error`;t.setAttribute(`role`,n?`alert`:`status`),t.setAttribute(`aria-live`,n?`assertive`:`polite`),t.className=`global-notice ${Ft.tone}`}async function Vt(e){let t=await re();t.length===0?Nt=`create-workspace`:(A=t[0],j=await C(A.id)),e.innerHTML=Ht();let n=sessionStorage.getItem(`cg.notice.postReload`);if(n){sessionStorage.removeItem(`cg.notice.postReload`);try{let t=JSON.parse(n);t.message&&J(e,t.tone===`error`||t.tone===`success`?t.tone:`info`,t.message)}catch{}}Ut(e),$(e,Nt),Q(e)}function Ht(){return`
    <div id="global-notice" hidden class="global-notice" role="status" aria-live="polite"></div>

    <!-- Skip link for accessibility -->
    <a class="skip-link" href="#main-content">Skip to content</a>

    <!-- App Header -->
    <header class="app-header" role="banner">
      <div class="header-inner">
        <div class="brand">
          <img src="./icons/icon-32.png" alt="" width="28" height="28" class="brand-icon" />
          <span class="brand-name">CommonGround</span>
          <span class="brand-tag">Suite</span>
        </div>
        <nav class="main-nav" role="navigation" aria-label="Main navigation">
          <button class="nav-btn active" data-route="dashboard" aria-current="page" title="See your overall workspace summary.">Dashboard</button>
          <button class="nav-btn" data-route="matters" title="View and open all cases (matters).">Matters</button>
          <button class="nav-btn" data-route="settings" title="Manage backups, recovery, and optional debug tools.">Settings</button>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" class="main-content" role="main" tabindex="-1">
      <div id="route-outlet" class="route-outlet"></div>
      <div id="modal-root"></div>
    </main>

    <!-- Footer -->
    <footer class="app-footer" role="contentinfo">
      <span>COMMONGROUND Suite ${Pt} · Resolve clearly.</span>
    </footer>
  `}function Ut(e){e.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-route], [data-matter-click], [data-action]`);if(!n)return;let r=n.dataset.route,i=n.dataset.matterClick,a=n.dataset.action,o=n.dataset.issueId,s=n.dataset.sessionId,c=n.dataset.commitmentId,l=n.dataset.followUpId,u=n.dataset.filter,d=n.dataset.phase;if(r)G=null,$(e,r);else if(i)G=null,await Wt(e,i);else if(a===`set-matter-filter`&&u)W=u,$(e,`matters`);else if(a===`set-current-phase`&&d)await Zt(e,d);else if(a===`add-participant`)await Gt(e);else if(a===`capture-consent`){let t=n.closest(`[data-participant-id]`)?.dataset.participantId;t&&await Kt(e,t)}else a===`edit-issue`&&o?await qt(e,o):a===`delete-issue`&&o?await Jt(e,o):a===`delete-session`&&s?await Yt(e,s):a===`delete-commitment`&&c?await Xt(e,c):a===`export-matter`?await Qt(e):a===`delete-matter`?await $t(e):a===`import-bundle`?await en(e):a===`reset-cache`?await tn(e):a===`factory-reset`?await nn(e):a===`populate-demo-data`?await rn(e):a===`print-page`?window.print():a===`complete-followup`&&l?await an(e,l):a===`delete-followup`&&l?await on(e,l):a===`refresh-negotiation-pack`?await sn(e):a===`refresh-team-health-pack`?await cn(e):a===`refresh-performance-conversation-pack`?await ln(e):a===`refresh-change-facilitation-pack`?await un(e):a===`modal-cancel`?(G=null,Q(e)):a===`modal-save-participant`?await dn(e):a===`modal-confirm-consent`?await fn(e):a===`modal-save-issue`?await pn(e):a===`modal-confirm-delete`?await mn(e):a===`modal-confirm-matter-delete`?await hn(e):a===`modal-confirm-factory-reset`?await gn(e):a===`modal-save-followup-result`&&await _n(e)}),e.addEventListener(`keydown`,t=>{if(!G){let n=t.target.closest(`[data-matter-click]`);if(n&&(t.key===`Enter`||t.key===` `)){t.preventDefault();let r=n.dataset.matterClick;r&&(G=null,Wt(e,r));return}}if(!G)return;if(t.key===`Escape`){t.preventDefault(),G=null,Q(e);return}if(t.key!==`Tab`)return;let n=e.querySelector(`.modal-card`);if(!n)return;let r=Array.from(n.querySelectorAll(`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`)).filter(e=>!e.hasAttribute(`disabled`));if(r.length===0)return;let i=r[0],a=r[r.length-1],o=document.activeElement;!t.shiftKey&&o===a?(t.preventDefault(),i.focus()):t.shiftKey&&o===i&&(t.preventDefault(),a.focus())})}async function Wt(e,t){let n=await S(t);n&&(M=n,N=await w(t),P=await me(t)??null,F=await T(t),I=await E(t),L=await D(t),R=await O(t),z=null,B=null,V=null,H=null,await Z(),$(e,`matter-detail`))}async function Z(){if(!M||!A)return;let e=[...I].sort((e,t)=>t.date.localeCompare(e.date))[0],t=At({suitabilityState:M.suitabilityState,hasIntake:!!P,issueCount:F.length,sessionCount:I.length,commitmentCount:L.length,followUpCount:R.length,latestSessionPhase:e?.phase}),n=Mt(M.currentPhase,t),r=jt({suitabilityState:M.suitabilityState,hasIntake:!!P,issueCount:F.length,sessionCount:I.length,commitmentCount:L.length,followUpCount:R.length});n===M.currentPhase&&r===M.status||(M=await ae(M.id,{currentPhase:n,status:r}),j=await C(A.id))}async function Gt(e){M&&(Y(),G={type:`add-participant`,name:``},Q(e))}async function Kt(e,t){let n=N.find(e=>e.id===t);n&&(Y(),G={type:`capture-consent`,participantId:t,participantName:n.displayName},Q(e))}async function qt(e,t){let n=F.find(e=>e.id===t);n&&(Y(),G={type:`edit-issue`,issueId:t,label:n.label,notes:n.notes},Q(e))}async function Jt(e,t){Y(),G={type:`confirm-delete`,entity:`issue`,id:t,title:`Delete issue?`,body:`This removes the issue from the map. This action cannot be undone.`},Q(e)}async function Yt(e,t){Y(),G={type:`confirm-delete`,entity:`session`,id:t,title:`Delete session record?`,body:`This permanently removes this session from the log.`},Q(e)}async function Xt(e,t){Y(),G={type:`confirm-delete`,entity:`commitment`,id:t,title:`Delete commitment?`,body:`This removes the commitment and its status history from this case.`},Q(e)}async function Zt(e,t){if(M){if(M.suitabilityState===`routed-out`){J(e,`error`,`Workflow phase is locked because this matter is routed out.`);return}try{M=await ae(M.id,{currentPhase:t}),j=await C(M.workspaceId),J(e,`success`,`Workflow phase set to ${t.replace(`-`,` `)}.`),$(e,`matter-detail`)}catch(t){J(e,`error`,t instanceof Error?t.message:`Unable to update workflow phase.`)}}}async function Qt(e){if(!M){J(e,`error`,`No matter selected. Open a matter first, then run export.`);return}try{J(e,`success`,`Exported ${(await ut(M.id)).filename}`)}catch(t){J(e,`error`,t instanceof Error?t.message:`Export failed.`)}}async function $t(e){!M||!A||(Y(),G={type:`confirm-matter-delete`,matterTitle:M.title,phrase:``},Q(e))}async function en(e){if(!A){J(e,`error`,`Create or open a workspace before importing.`);return}let t=A,n=document.createElement(`input`);n.type=`file`,n.accept=`application/json,.json`,n.onchange=async()=>{let r=n.files?.[0];if(r){if(r.size>26214400){J(e,`error`,`Import blocked: file exceeds ${Math.round(xt/(1024*1024))} MB limit.`);return}try{let n=Et(await Dt(r));if(n.status!==`valid`){J(e,`error`,`Import blocked: ${n.errors.join(`; `)||n.status}`);return}if(!n.bundle){J(e,`error`,`Import failed: bundle payload missing after validation.`);return}let i=await Ot(n.bundle,t.id);j=await C(t.id),await Wt(e,i.matterId),J(e,`success`,`Import complete: ${i.matterTitle}`)}catch(t){J(e,`error`,t instanceof Error?t.message:`Import failed.`)}}},n.click()}async function tn(e){try{let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e))),sessionStorage.setItem(`cg.notice.postReload`,JSON.stringify({tone:`success`,message:`Cache cleared. Running latest app files now.`})),location.reload()}catch{J(e,`error`,`Cache reset failed.`)}}async function nn(e){Y(),G={type:`confirm-factory-reset`,phrase:``},Q(e)}async function rn(e){if(!A){J(e,`error`,`Create a workspace before generating demo data.`);return}try{let t=new Date,n=new Date(t);n.setDate(t.getDate()+7);let r=new Date(t);r.setDate(t.getDate()+14);let i=t.toISOString().slice(0,10),a=await x(A.id,`Demo: Team Alignment Sprint (${i})`,`team-health`);await ae(a.id,{suitabilityState:`suitable`,status:`active`,currentPhase:`info-exchange`});let o=await ce(a.id,`Alex Facilitator`,`facilitator`),s=await ce(a.id,`Jordan Product Lead`),c=await ce(a.id,`Riley Engineering Lead`);await le(o.id,!0,!0,!0),await le(s.id,!0,!0,!0),await le(c.id,!0,!0,!0),await he({matterId:a.id,participantId:s.id,source:`organizational`,visibility:`facilitator`,responses:{notes:`Cross-team friction has slowed delivery.`,desiredOutcome:`Agree on ownership boundaries and delivery priorities.`,constraints:`Release deadline in 4 weeks. Limited staffing.`},riskFlags:Rn.map(e=>({category:e,triggered:!1,note:``}))}),await ve(a.id,`Ownership boundaries`,`Clarify who decides roadmap changes.`,`critical`),await ve(a.id,`Sprint capacity`,`Estimate realistic delivery commitments.`,`high`),await ve(a.id,`Escalation path`,`Define what gets escalated and when.`,`medium`),await we({matterId:a.id,phase:`info-exchange`,agenda:[`State current blockers`,`Agree on top priorities`,`Draft handoff rules`],notes:`Parties aligned on primary blocker and agreed to trial a weekly sync.`,participantIds:[o.id,s.id,c.id]}),await ke((await Oe({matterId:a.id,ownerId:s.id,text:`Publish product priority rubric by Friday.`,dueDate:n.toISOString().slice(0,10)})).id,`in-progress`),await ke((await Oe({matterId:a.id,ownerId:c.id,text:`Provide engineering estimate ranges for top 5 items.`,dueDate:r.toISOString().slice(0,10)})).id,`complete`),await Pe((await Ne(a.id,n.toISOString().slice(0,10))).id,`Weekly sync completed. Teams confirmed improved clarity on ownership.`),await Ne(a.id,r.toISOString().slice(0,10)),await ae((await x(A.id,`Demo: Route-Out Scenario (${i})`,`conflict-resolution`)).id,{suitabilityState:`routed-out`,status:`intake`}),j=await C(A.id),await Wt(e,a.id),J(e,`success`,`Demo dataset created. Open Matters to view both sample scenarios.`)}catch(t){J(e,`error`,t instanceof Error?t.message:`Unable to create demo data.`)}}async function an(e,t){Y(),G={type:`complete-followup`,followUpId:t,result:``},Q(e)}async function on(e,t){Y(),G={type:`confirm-delete`,entity:`follow-up`,id:t,title:`Delete follow-up entry?`,body:`This removes the follow-up date and any recorded outcome notes.`},Q(e)}async function sn(e){M&&(z=await Re(M.id),$(e,`negotiation-pack`))}async function cn(e){M&&(B=await Be(M.id),$(e,`team-health-pack`))}async function ln(e){M&&(V=await We(M.id),$(e,`performance-conversation-pack`))}async function un(e){M&&(H=await qe(M.id),$(e,`change-facilitation-pack`))}async function dn(e){if(!M||!G||G.type!==`add-participant`)return;let t=e.querySelector(`#modal-participant-name`),n=String(t?.value??``).trim();if(!n){G={...G,error:`Participant name is required.`},Q(e);return}let r=X(n,U.participantName,`Participant name`);if(r){G={...G,error:r},Q(e);return}await ce(M.id,n),N=await w(M.id),G=null,$(e,`matter-detail`)}async function fn(e){!M||!G||G.type!==`capture-consent`||(await le(G.participantId,!0,!0,!0),N=await w(M.id),G=null,$(e,`matter-detail`))}async function pn(e){if(!M||!G||G.type!==`edit-issue`)return;let t=String(e.querySelector(`#modal-issue-label`)?.value??``).trim(),n=String(e.querySelector(`#modal-issue-notes`)?.value??``).trim();if(!t){G={...G,error:`Issue label is required.`},Q(e);return}let r=X(t,U.issueLabel,`Issue label`);if(r){G={...G,error:r},Q(e);return}await ye(G.issueId,{label:t,notes:n}),F=await T(M.id),await Z(),G=null,$(e,`issue-map`)}async function mn(e){if(!(!M||!G||G.type!==`confirm-delete`)){if(G.entity===`issue`){await xe(G.id),F=await T(M.id),await Z(),G=null,$(e,`issue-map`);return}if(G.entity===`session`){let _cs=L.filter(c=>c.sessionId===G.id);await Promise.all(_cs.map(c=>Ee.update(c.id,{sessionId:null})));await Te(G.id),I=await E(M.id),L=await D(M.id),await Z(),G=null,$(e,`session`);return}if(G.entity===`commitment`){await Ae(G.id),L=await D(M.id),await Z(),G=null,$(e,`commitments`);return}await Fe(G.id),R=await O(M.id),await Z(),G=null,$(e,`follow-up`)}}async function hn(e){if(!M||!A||!G||G.type!==`confirm-matter-delete`)return;let t=String(e.querySelector(`#modal-delete-phrase`)?.value??``).trim();if(t!==`DELETE`){G={...G,phrase:t,error:`Type DELETE exactly to confirm.`},Q(e);return}try{await bt(M.id),j=await C(A.id),Rt(),G=null,J(e,`success`,`Matter deleted.`),$(e,`matters`)}catch(t){G=null,Q(e),J(e,`error`,t instanceof Error?t.message:`Unable to delete matter.`)}}async function gn(e){if(!G||G.type!==`confirm-factory-reset`)return;let t=String(e.querySelector(`#modal-factory-reset-phrase`)?.value??``).trim();if(t!==`DELETE`){G={...G,phrase:t,error:`Type DELETE exactly to confirm.`},Q(e);return}try{if(`serviceWorker`in navigator){let e=await navigator.serviceWorker.getRegistrations();await Promise.all(e.map(e=>e.unregister()))}if(`caches`in window){let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}localStorage.clear(),sessionStorage.clear(),await m(),sessionStorage.setItem(`cg.notice.postReload`,JSON.stringify({tone:`success`,message:`All local app data has been deleted.`})),location.reload()}catch{G=null,Q(e),J(e,`error`,`Factory reset failed. Close other open tabs of this app and try again.`)}}async function _n(e){if(!M||!G||G.type!==`complete-followup`)return;let t=String(e.querySelector(`#modal-followup-result`)?.value??``).trim();if(!t){G={...G,error:`Outcome notes are required before marking complete.`},Q(e);return}let n=X(t,U.followupResult,`Outcome notes`);if(n){G={...G,error:n},Q(e);return}await Pe(G.followUpId,t),R=await O(M.id),await Z(),G=null,$(e,`follow-up`)}function vn(){return[{done:M?.suitabilityState!==`pending`,label:`Suitability assessed`,route:`suitability`},{done:!!P,label:`Intake captured`,route:`intake`},{done:F.length>0,label:`Issue map started`,route:`issue-map`},{done:I.length>0,label:`Session logged`,route:`session`},{done:L.length>0,label:`Commitment recorded`,route:`commitments`},{done:R.length>0,label:`Follow-up scheduled`,route:`follow-up`}]}function yn(){if(M?.suitabilityState===`routed-out`)return{label:`Suitability assessed`,route:`suitability`,reason:`This matter is routed out for safety. Workflow steps stay locked except suitability review.`};let e=vn().find(e=>!e.done);return e?{label:e.label,route:e.route,reason:{dashboard:`Return to overview.`,"create-workspace":`Create your workspace first.`,"create-matter":`Create a new matter to proceed.`,onboarding:`Complete onboarding.`,matters:`Select a matter.`,"matter-detail":`Review matter details.`,intake:`Capture context and risk flags early.`,suitability:`Confirm this case is safe and suitable first.`,"issue-map":`Define what needs to be resolved.`,session:`Log what was discussed and agreed.`,commitments:`Assign concrete actions with ownership.`,"follow-up":`Plan accountability checkpoints.`,"negotiation-pack":`Review synthesized briefing for readiness.`,"team-health-pack":`Review team collaboration signals and focus areas.`,"performance-conversation-pack":`Review coaching readiness and accountability signals.`,"change-facilitation-pack":`Review change readiness, risks, and adoption progress signals.`,export:`Export for archive and handoff.`,settings:`Adjust workspace settings.`,recovery:`Use recovery only for data troubleshooting.`}[e.route]}:{label:`Workflow complete`,route:`negotiation-pack`,reason:`All core workflow steps are done. Review the negotiation pack for final readiness.`}}function Q(e){let t=e.querySelector(`#modal-root`);if(!t)return;if(!G){t.innerHTML=``,Lt&&Lt.isConnected&&Lt.focus(),Lt=null;return}let n=``;n=G.type===`add-participant`?`
      <h2 id="modal-title" class="section-title">Add Participant</h2>
      <p id="modal-desc" class="page-subtitle">Enter the participant's display name to add them to this matter.</p>
        ${G.error?`<p class="form-error">${K(G.error)}</p>`:``}
      <div class="form-group">
        <label for="modal-participant-name">Participant name</label>
        <input id="modal-participant-name" class="input" type="text" value="${K(G.name)}" maxlength="${U.participantName}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Close this dialog without saving.">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="modal-save-participant" title="Add this participant to the current matter.">Add</button>
      </div>
    `:G.type===`capture-consent`?`
      <h2 id="modal-title" class="section-title">Capture Consent</h2>
      <p id="modal-desc" class="page-subtitle">Apply standard consent flags for <strong>${K(G.participantName)}</strong>?</p>
      <ul class="text-sm color-muted modal-list">
        <li>Process data locally</li>
        <li>Record session notes</li>
        <li>Share with other parties when needed</li>
      </ul>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Close this dialog without changing consent.">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="modal-confirm-consent" title="Record consent for this participant now.">Confirm Consent</button>
      </div>
    `:G.type===`edit-issue`?`
      <h2 id="modal-title" class="section-title">Edit Issue</h2>
      <p id="modal-desc" class="page-subtitle">Update the issue label and notes.</p>
        ${G.error?`<p class="form-error">${K(G.error)}</p>`:``}
      <div class="form-group">
        <label for="modal-issue-label">Issue label</label>
        <input id="modal-issue-label" class="input" type="text" value="${K(G.label)}" maxlength="${U.issueLabel}" />
      </div>
      <div class="form-group">
        <label for="modal-issue-notes">Issue notes</label>
        <textarea id="modal-issue-notes" class="input" rows="4" maxlength="${U.issueNotes}">${K(G.notes)}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Close this dialog without editing the issue.">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="modal-save-issue" title="Save your issue updates.">Save Changes</button>
      </div>
    `:G.type===`complete-followup`?`
      <h2 id="modal-title" class="section-title">Complete Follow-Up</h2>
      <p id="modal-desc" class="page-subtitle">Record what happened before closing this follow-up.</p>
        ${G.error?`<p class="form-error">${K(G.error)}</p>`:``}
      <div class="form-group">
        <label for="modal-followup-result">Outcome notes</label>
        <textarea id="modal-followup-result" class="input" rows="4" maxlength="${U.followupResult}">${K(G.result)}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Close this dialog without completing the follow-up.">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="modal-save-followup-result" title="Save outcome notes and mark this follow-up complete.">Mark Complete</button>
      </div>
    `:G.type===`confirm-matter-delete`?`
      <h2 id="modal-title" class="section-title">Delete Matter</h2>
      <p id="modal-desc" class="page-subtitle">Delete <strong>${K(G.matterTitle)}</strong> and all linked records from this device.</p>
        ${G.error?`<p class="form-error">${K(G.error)}</p>`:``}
      <div class="form-group">
        <label for="modal-delete-phrase">Type DELETE to confirm</label>
        <input id="modal-delete-phrase" class="input" type="text" value="${K(G.phrase)}" autocomplete="off" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Keep this matter and return safely.">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="modal-confirm-matter-delete" title="Permanently delete this matter and all related records.">Delete Matter</button>
      </div>
    `:G.type===`confirm-factory-reset`?`
      <h2 id="modal-title" class="section-title">Factory Reset</h2>
      <p id="modal-desc" class="page-subtitle">This permanently deletes all local matters, notes, and settings for this app on this device.</p>
        ${G.error?`<p class="form-error">${K(G.error)}</p>`:``}
      <div class="form-group">
        <label for="modal-factory-reset-phrase">Type DELETE to confirm full reset</label>
        <input id="modal-factory-reset-phrase" class="input" type="text" value="${K(G.phrase)}" autocomplete="off" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Cancel and keep all local data.">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="modal-confirm-factory-reset" title="Permanently delete all local app data.">Factory Reset</button>
      </div>
    `:`
      <h2 id="modal-title" class="section-title">${K(G.title)}</h2>
      <p id="modal-desc" class="page-subtitle">${K(G.body)}</p>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-action="modal-cancel" title="Close this dialog without deleting anything.">Cancel</button>
        <button type="button" class="btn btn-danger" data-action="modal-confirm-delete" title="Permanently delete this item.">Delete</button>
      </div>
    `,t.innerHTML=`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
      <div class="modal-card card stack-md">
        ${n}
      </div>
    </div>
  `,t.querySelector(`input, textarea, button, [href], select, [tabindex]:not([tabindex="-1"])`)?.focus()}function $(e,t){t===`onboarding`?t=`create-workspace`:t===`recovery`&&(t=`settings`),t!==`suitability`&&t!==`dashboard`&&t!==`matters`&&t!==`settings`&&M?.suitabilityState===`pending`&&(t=`suitability`),Sn(t)||(t=`dashboard`),Nt=t;let n=e.querySelector(`#route-outlet`);if(!n)return;let r=e.querySelector(`.app-header`);r&&r.classList.toggle(`is-hidden`,t===`create-workspace`);let i=bn(t);e.querySelectorAll(`.nav-btn`).forEach(e=>{let t=e,n=t.dataset.route===i;t.classList.toggle(`active`,n),t.setAttribute(`aria-current`,n?`page`:`false`)}),n.innerHTML=wn(t),Cn(e,t),Bt(e),Q(e),xn(t),typeof window.scrollTo==`function`&&window.scrollTo({top:0,left:0,behavior:`auto`})}function bn(e){return e===`dashboard`?`dashboard`:e===`settings`?`settings`:`matters`}function xn(e){let t={"create-workspace":`Create Workspace`,onboarding:`Onboarding`,dashboard:`Dashboard`,"create-matter":`New Matter`,matters:`Matters`,"matter-detail":M?`${M.title}`:`Matter Detail`,suitability:`Suitability Assessment`,intake:`Intake Record`,"issue-map":`Issue Map`,session:`Session Log`,commitments:`Commitments`,"follow-up":`Follow-Up Log`,export:`Export Packet`,settings:`Settings`,recovery:`Recovery`,"negotiation-pack":`Negotiation Pack`,"team-health-pack":`Team Health Pack`,"performance-conversation-pack":`Performance Pack`,"change-facilitation-pack":`Change Pack`}[e]??`App`;document.title=`${t} | CommonGround Suite`}function Sn(e){return!M||M.suitabilityState!==`routed-out`?!0:e===`dashboard`||e===`matters`||e===`create-matter`||e===`settings`||e===`suitability`||e===`matter-detail`}function Cn(e,t){if(t===`create-workspace`){let t=e.querySelector(`#create-workspace-form`);t?.addEventListener(`submit`,async n=>{n.preventDefault();let r=new FormData(t),i=String(r.get(`name`)??``).trim(),a=String(r.get(`owner`)??``).trim();if(i&&a){let t=X(i,U.workspaceName,`Workspace name`),n=X(a,U.facilitatorName,`Facilitator name`);if(t||n){J(e,`error`,t??n??`Invalid workspace fields.`);return}A=await ne(i,a),$(e,`dashboard`)}})}if(t===`create-matter`){let t=e.querySelector(`#create-matter-form`);t?.addEventListener(`submit`,async n=>{if(n.preventDefault(),!A)return;let r=new FormData(t),i=String(r.get(`title`)??``).trim(),a=r.get(`type`);if(i){let t=X(i,U.matterTitle,`Matter title`);if(t){J(e,`error`,t);return}await x(A.id,i,a),j=await C(A.id),$(e,`dashboard`)}})}if(t===`suitability`){let t=e.querySelector(`#suitability-form`),n=e.querySelector(`#suitability-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;let i=new FormData(t),a=i.get(`outcome`),o=String(i.get(`notes`)??``),s=X(o,U.suitabilityNotes,`Assessment rationale`);if(s){n.textContent=s,n.hidden=!1;return}n.hidden=!0;try{let e=ft({q1:i.get(`q1`)===`yes`,q2:i.get(`q2`)===`yes`,q3:i.get(`q3`)===`yes`,q4:i.get(`q4`)===`yes`,q5:i.get(`q5`)===`yes`,q6:i.get(`q6`)===`yes`,q7:i.get(`q7`)===`yes`,q8:i.get(`q8`)===`yes`,q9:i.get(`q9`)===`yes`,q10:i.get(`q10`)===`yes`},a,o);await ae(M.id,{suitabilityState:a,suitabilityCheck:e.checklist})}catch(e){n.textContent=e instanceof Error?e.message:`Unable to complete assessment.`,n.hidden=!1;return}let c=await S(M.id);c&&(M=c),await Z(),a===`routed-out`?(J(e,`error`,`Case not suitable: routed out. Please follow safe exit protocols.`),$(e,`dashboard`)):$(e,`matter-detail`)})}if(t===`intake`){let t=e.querySelector(`#intake-form`),n=e.querySelector(`#intake-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;if(N.length===0){n.textContent=`Add at least one participant before capturing intake.`,n.hidden=!1;return}let i=new FormData(t),a=String(i.get(`participantId`)??``),o=String(i.get(`source`)??`self`),s=String(i.get(`visibility`)??`facilitator`),c=String(i.get(`notes`)??``),l=String(i.get(`desiredOutcome`)??``),u=String(i.get(`constraints`)??``),d=X(c,U.intakeNotes,`Context notes`),f=X(l,U.intakeDesiredOutcome,`Desired outcome`),p=X(u,U.intakeConstraints,`Constraints`);if(d||f||p){n.textContent=d??f??p??`Intake content is too long.`,n.hidden=!1;return}let m=Rn.map(e=>({category:e,triggered:i.get(`risk-${e}`)===`on`,note:String(i.get(`risk-note-${e}`)??``)})),h=m.map(e=>X(e.note??``,U.intakeRiskNote,`Risk note (${e.category})`)).find(e=>!!e);if(h){n.textContent=h,n.hidden=!1;return}n.hidden=!0,await he({matterId:M.id,participantId:a,source:o,visibility:s,responses:{notes:c,desiredOutcome:l,constraints:u},riskFlags:m}),P=await me(M.id,a)??null,await Z(),J(e,`success`,`Intake saved.`),$(e,`matter-detail`)}),e.querySelector(`#participant-id`)?.addEventListener(`change`,async ev=>{if(!M)return;const pid=ev.target.value;let rec=await me(M.id,pid)??null,f=e.querySelector(`#intake-form`);if(!f)return;f.querySelector(`#source`).value=rec?.source??`self`;f.querySelector(`#notes`).value=rec?.responses?.notes??``;f.querySelector(`#desired-outcome`).value=rec?.responses?.desiredOutcome??``;f.querySelector(`#constraints`).value=rec?.responses?.constraints??``;for(const cat of Rn){const rfData=rec?.riskFlags?.find(r=>r.category===cat),cb=f.querySelector(`[name="risk-${cat}"]`),ni=f.querySelector(`[name="risk-note-${cat}"]`);if(cb)cb.checked=rfData?.triggered??!1;if(ni)ni.value=rfData?.note??``}})}if(t===`issue-map`){let t=e.querySelector(`#issue-form`),n=e.querySelector(`#issue-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;let i=new FormData(t),a=String(i.get(`label`)??``).trim(),o=String(i.get(`notes`)??``),s=String(i.get(`priority`)??`medium`);if(!a){n.textContent=`Issue label is required.`,n.hidden=!1;return}let c=X(a,U.issueLabel,`Issue label`);if(c){n.textContent=c,n.hidden=!1;return}let l=X(o,U.issueNotes,`Issue notes`);if(l){n.textContent=l,n.hidden=!1;return}n.hidden=!0,await ve(M.id,a,o,s),F=await T(M.id),await Z(),t.reset(),$(e,`issue-map`)}),e.querySelectorAll(`[data-action="set-priority"]`).forEach(t=>{t.addEventListener(`change`,async()=>{if(!M)return;let n=t.dataset.issueId,r=t.value;n&&(await be(n,r),F=await T(M.id),await Z(),$(e,`issue-map`))})})}if(t===`session`){let t=e.querySelector(`#session-form`),n=e.querySelector(`#session-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;let i=new FormData(t),a=String(i.get(`agenda`)??``),o=String(i.get(`notes`)??``),s=String(i.get(`phase`)??`preparation`),c=i.getAll(`participantIds`).map(e=>String(e));if(a.trim().length===0){n.textContent=`Agenda is required.`,n.hidden=!1;return}let l=X(a,U.sessionAgenda,`Session agenda`),u=X(o,U.sessionNotes,`Session notes`);if(l||u){n.textContent=l??u??`Session content is too long.`,n.hidden=!1;return}n.hidden=!0,await we({matterId:M.id,phase:s,agenda:a.split(`
`),notes:o,participantIds:c}),I=await E(M.id),await Z(),t.reset(),$(e,`session`)})}if(t===`commitments`){let t=e.querySelector(`#commitment-form`),n=e.querySelector(`#commitment-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;let i=new FormData(t),a=String(i.get(`ownerId`)??``),o=String(i.get(`text`)??``),s=String(i.get(`dueDate`)??``);if(!a||o.trim().length===0){n.textContent=`Owner and commitment text are required.`,n.hidden=!1;return}let c=X(o,U.commitmentText,`Commitment text`);if(c){n.textContent=c,n.hidden=!1;return}n.hidden=!0,await Oe({matterId:M.id,ownerId:a,text:o,dueDate:s||void 0}),L=await D(M.id),await Z(),t.reset(),$(e,`commitments`)}),e.querySelectorAll(`[data-action="set-commitment-status"]`).forEach(t=>{t.addEventListener(`change`,async()=>{if(!M)return;let n=t.dataset.commitmentId;n&&(await ke(n,t.value),L=await D(M.id),await Z(),$(e,`commitments`))})})}if(t===`follow-up`){let t=e.querySelector(`#followup-form`),n=e.querySelector(`#followup-error`);t?.addEventListener(`submit`,async r=>{if(r.preventDefault(),!M)return;let i=new FormData(t),a=String(i.get(`targetDate`)??``);if(!a){n.textContent=`Target date is required.`,n.hidden=!1;return}n.hidden=!0,await Ne(M.id,a),R=await O(M.id),await Z(),t.reset(),$(e,`follow-up`)})}if(t===`negotiation-pack`){if(!M)return;(!z||z.matterId!==M.id)&&sn(e)}if(t===`team-health-pack`){if(!M)return;(!B||B.matterId!==M.id)&&cn(e)}if(t===`performance-conversation-pack`){if(!M)return;(!V||V.matterId!==M.id)&&ln(e)}if(t===`change-facilitation-pack`){if(!M)return;(!H||H.matterId!==M.id)&&un(e)}}function wn(e){switch(e){case`dashboard`:return Dn();case`create-workspace`:return Tn();case`create-matter`:return En();case`matter-detail`:return Nn();case`matters`:return On();case`settings`:return In();case`intake`:return Bn();case`issue-map`:return Vn();case`session`:return Hn();case`commitments`:return Un();case`follow-up`:return Wn();case`negotiation-pack`:return Kn();case`team-health-pack`:return qn();case`performance-conversation-pack`:return Jn();case`change-facilitation-pack`:return Yn();case`export`:return Gn();case`suitability`:return zn();default:return`<div class="empty-state"><h2>Route not found</h2><p>${K(e)}</p></div>`}}function Tn(){return`
    <div class="page-container center-content">
      <div class="card onboarding-card">
        <h1 class="page-title">Welcome to CommonGround</h1>
        <p class="page-subtitle">Setup your facilitator workspace to begin.</p>
        
        <form id="create-workspace-form" class="stack-md">
          <div class="form-group">
            <label class="label-with-tip" for="ws-name">Workspace Name ${q(`This is your private space for organizing cases. You can rename it later.`)}</label>
            <input type="text" id="ws-name" name="name" placeholder="e.g. My Practice" required class="input" maxlength="${U.workspaceName}" />
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="ws-owner">Your Name (Facilitator) ${q(`This name is shown on records so people know who facilitated the process.`)}</label>
            <input type="text" id="ws-owner" name="owner" placeholder="e.g. Alex Rivera" required class="input" maxlength="${U.facilitatorName}" />
          </div>
          <p class="text-sm color-muted">Workspaces are stored locally in your browser and are never uploaded to any server.</p>
          <button type="submit" class="btn btn-primary btn-block" title="Create your local workspace and continue.">Create Workspace</button>
        </form>
      </div>
    </div>
  `}function En(){return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">New Matter</h1>
        <p class="page-subtitle">Initialize a new engagement or conflict resolution case.</p>
      </div>
      <div class="card stack-md">
        <form id="create-matter-form" class="stack-md">
          <div class="form-group">
            <label class="label-with-tip" for="m-title">Matter Title ${q(`Use a clear label so you can find this case quickly later.`)}</label>
            <input type="text" id="m-title" name="title" placeholder="e.g. Smith vs. Jones" required class="input" maxlength="${U.matterTitle}" />
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="m-type">Matter Type ${q(`Choose the conversation type. This helps organize records and future templates.`)}</label>
            <select id="m-type" name="type" class="input">
              <option value="conflict-resolution">Conflict Resolution</option>
              <option value="alignment-review">Alignment Review</option>
              <option value="negotiation">Negotiation</option>
              <option value="team-health">Team Health</option>
              <option value="performance-conversation">Performance Conversation</option>
              <option value="change-facilitation">Change Facilitation</option>
            </select>
          </div>
          <p class="text-sm color-muted">All matters begin in 'Draft' status with suitability 'Pending'.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="dashboard" title="Return without creating a new matter.">Cancel</button>
            <button type="submit" class="btn btn-primary" title="Create this matter and start the workflow.">Create Matter</button>
          </div>
        </form>
      </div>
    </div>
  `}function Dn(){let e=K(A?.name||`Workspace`),t=K(A?.owner||`Facilitator`),n=Mn(j).slice(0,5),r=j.filter(e=>e.suitabilityState===`pending`).length,i=j.filter(e=>e.suitabilityState===`routed-out`).length;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${e}</h1>
        <p class="page-subtitle">Facilitated by ${t}</p>
      </div>
      <div class="card-grid">
        <div class="stat-card">
          <span class="stat-label">Active Matters</span>
          <span class="stat-value">${j.filter(e=>e.status===`active`).length}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Need Suitability</span>
          <span class="stat-value">${r}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Routed Out</span>
          <span class="stat-value">${i}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Recent Matters</h2>
          <button class="btn btn-primary" data-route="create-matter" title="Start a new case or engagement.">New Matter</button>
        </div>
        ${Pn(n)}
      </div>
    </div>
  `}function On(){let e=An(),t=j.length,n=j.filter(e=>e.status===`active`).length,r=j.filter(e=>e.status===`draft`||e.status===`intake`).length,i=j.filter(e=>e.status===`closed`).length,a=e=>W===e?` chip-active`:``,o=e=>W===e?`true`:`false`,s=e.length>0||W===`all`?Pn(e):`
        <div class="empty-state">
          <p>No matters match the <strong>${jn(W)}</strong> filter.</p>
          <button class="btn btn-ghost btn-sm" data-action="set-matter-filter" data-filter="all" title="Return to the full matters list.">Show All Matters</button>
        </div>
      `;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Matters</h1>
        <p class="page-subtitle">All cases and engagements. To delete one matter, open it and use <strong>Delete Matter</strong> at the top.</p>
      </div>
      <div class="section-header">
        <div class="filter-row" role="group" aria-label="Filter matters by status">
          <button class="chip${a(`all`)}" data-action="set-matter-filter" data-filter="all" aria-pressed="${o(`all`)}" title="Show every matter (${t}).">All (${t})</button>
          <button class="chip${a(`active`)}" data-action="set-matter-filter" data-filter="active" aria-pressed="${o(`active`)}" title="Show matters currently in active work (${n}).">Active (${n})</button>
          <button class="chip${a(`intake`)}" data-action="set-matter-filter" data-filter="intake" aria-pressed="${o(`intake`)}" title="Show matters still in intake stage (${r}).">Intake (${r})</button>
          <button class="chip${a(`closed`)}" data-action="set-matter-filter" data-filter="closed" aria-pressed="${o(`closed`)}" title="Show matters that are closed (${i}).">Closed (${i})</button>
        </div>
        <div class="item-meta">
          ${W===`all`?``:`<button class="btn btn-ghost btn-sm" data-action="set-matter-filter" data-filter="all" title="Clear the current filter and show all matters.">Clear Filter</button>`}
          <button class="btn btn-primary" data-route="create-matter" title="Create a new matter.">+ New Matter</button>
        </div>
      </div>
      <p class="text-sm color-muted" role="status" aria-live="polite">
        Filter: <strong>${jn(W)}</strong>. Showing <strong>${e.length}</strong> of <strong>${t}</strong> ${kn(t)}.
      </p>
      ${s}
    </div>
  `}function kn(e){return e===1?`matter`:`matters`}function An(){return Mn(W===`all`?j:W===`active`?j.filter(e=>e.status===`active`):W===`intake`?j.filter(e=>e.status===`draft`||e.status===`intake`):j.filter(e=>e.status===`closed`))}function jn(e){return e===`all`?`All`:e===`active`?`Active`:e===`intake`?`Intake`:`Closed`}function Mn(e){return[...e].sort((e,t)=>t.updatedAt.localeCompare(e.updatedAt))}function Nn(){if(!M)return`<div class="empty-state"><p>No matter selected.</p></div>`;let e=vn(),t=e.filter(e=>e.done).length,n=yn(),r=Math.round(t/e.length*100),i=M.suitabilityState===`routed-out`,a=(e,t)=>!i||e===`suitability`?`title="${K(t)}"`:`disabled aria-disabled="true" title="Locked because this matter is routed out. Open Suitability to review."`;return`
    <div class="page-container">
      <div class="page-header">
        <div class="header-main">
          <button class="btn btn-ghost btn-sm" data-route="matters" title="Return to the matters list.">← Back to Matters</button>
          <button class="btn btn-ghost btn-sm btn-danger" data-action="delete-matter" title="Delete this matter and all related local records.">Delete Matter</button>
          <h1 class="page-title">${K(M.title)}</h1>
          <div class="badge-row">
            <span class="badge badge-${zt(M.status)}">${K(M.status)}</span>
            <span class="badge badge-outline">${K(M.currentPhase.replace(`-`,` `))}</span>
          </div>
        </div>
      </div>

      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Guided Workflow ${q(`Follow these steps in order. The next recommended step keeps progress logical and easy to track.`)}</h2>
          <span class="badge badge-outline">${t}/${e.length} complete (${r}%)</span>
        </div>
        <p class="text-sm color-muted"><strong>Next recommended step:</strong> ${K(n.label)}. ${K(n.reason)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" data-route="${n.route}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow is locked because this matter is routed out. Review suitability only.`:`Open the next recommended workflow step.`}">Go to Next Step</button>
        </div>
        <div class="workflow-checklist">
          ${e.map(e=>`
            <button class="workflow-item ${e.done?`done`:``}" data-route="${e.route}" ${i&&e.route!==`suitability`?`disabled aria-disabled="true"`:``} title="${i&&e.route!==`suitability`?`Locked because this matter is routed out. Open Suitability to review.`:`Open this workflow step.`}">
              <span>${e.done?`✓`:`○`}</span>
              <span>${K(e.label)}</span>
            </button>
          `).join(``)}
        </div>
      </div>

      <div class="grid-layout">
        <section class="stack-md">
          <div class="section-header">
            <h2 class="section-title">Participants</h2>
            <button class="btn btn-ghost btn-sm" data-action="add-participant" title="Add a person involved in this matter.">+ Add</button>
          </div>
          ${Fn(N)}
        </section>

        <aside class="stack-md">
          <div class="card stack-sm">
            <h3>Workflow Phase ${q(`The current stage of the conversation. It auto-advances as records are completed, and you can still set it manually.`)}</h3>
            <p class="text-sm color-muted">Phases move forward automatically as you save intake, issues, sessions, commitments, and follow-ups.</p>
            <p class="text-xs color-muted">Tip: these phase labels are buttons. Click one to set the stage manually.</p>
            <details class="debug-section">
              <summary class="debug-summary">When phases auto-advance (plain language)</summary>
              <div class="debug-body">
                <ul class="stack-sm text-xs color-muted">
                  <li><strong>Introduction:</strong> after suitability is completed.</li>
                  <li><strong>Info Exchange:</strong> after at least one intake record is saved.</li>
                  <li><strong>Interest Discovery:</strong> after at least one issue is added.</li>
                  <li><strong>Evaluation:</strong> after at least one session and one commitment are saved.</li>
                  <li><strong>Agreement:</strong> after at least one follow-up is scheduled.</li>
                </ul>
              </div>
            </details>
            <div class="workflow-stepper" role="group" aria-label="Workflow phase stepper">
              <button class="step ${M.currentPhase===`preparation`?`active`:``}" data-action="set-current-phase" data-phase="preparation" aria-pressed="${M.currentPhase===`preparation`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Preparation: set scope, participants, and logistics. Click to set this phase manually.`}">Preparation</button>
              <button class="step ${M.currentPhase===`introduction`?`active`:``}" data-action="set-current-phase" data-phase="introduction" aria-pressed="${M.currentPhase===`introduction`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Introduction: align on purpose, process, and expectations. Click to set this phase manually.`}">Introduction</button>
              <button class="step ${M.currentPhase===`info-exchange`?`active`:``}" data-action="set-current-phase" data-phase="info-exchange" aria-pressed="${M.currentPhase===`info-exchange`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Info Exchange: gather facts, context, and constraints. Click to set this phase manually.`}">Info Exchange</button>
              <button class="step ${M.currentPhase===`interest-discovery`?`active`:``}" data-action="set-current-phase" data-phase="interest-discovery" aria-pressed="${M.currentPhase===`interest-discovery`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Interest Discovery: clarify underlying needs, not only positions. Click to set this phase manually.`}">Interest Discovery</button>
              <button class="step ${M.currentPhase===`option-generation`?`active`:``}" data-action="set-current-phase" data-phase="option-generation" aria-pressed="${M.currentPhase===`option-generation`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Option Generation: brainstorm possible solutions without committing yet. Click to set this phase manually.`}">Option Generation</button>
              <button class="step ${M.currentPhase===`evaluation`?`active`:``}" data-action="set-current-phase" data-phase="evaluation" aria-pressed="${M.currentPhase===`evaluation`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Evaluation: compare options, feasibility, and trade-offs. Click to set this phase manually.`}">Evaluation</button>
              <button class="step ${M.currentPhase===`agreement`?`active`:``}" data-action="set-current-phase" data-phase="agreement" aria-pressed="${M.currentPhase===`agreement`?`true`:`false`}" ${i?`disabled aria-disabled="true"`:``} title="${i?`Workflow phase is locked because this matter is routed out.`:`Agreement: confirm decisions, owners, and follow-through plan. Click to set this phase manually.`}">Agreement</button>
            </div>
          </div>
          <div class="card stack-sm">
            <h3>Suitability ${q(`A safety check that confirms whether this case should proceed in this process.`)}</h3>
            <div class="suitability-summary">
              <span class="badge-dot badge-${zt(M.suitabilityState)}">${K(M.suitabilityState)}</span>
              <button class="btn btn-ghost btn-sm btn-block" data-route="suitability" ${a(`suitability`,`Confirm this matter is safe and suitable to proceed.`)}>Assess Suitability</button>
            </div>
          </div>
          <div class="card stack-sm">
            <h3>Intake ${q(`Initial context gathering: what is happening, desired outcomes, and boundaries.`)}</h3>
            <p class="text-sm color-muted">Capture structured intake and route-out flags.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="intake" ${a(`intake`,`Capture intake context and risk flags.`)}>
              ${P?`Edit Intake`:`Capture Intake`}
            </button>
          </div>
          <div class="card stack-sm">
            <h3>Issue Map ${q(`A prioritized list of key topics that need to be resolved.`)}</h3>
            <p class="text-sm color-muted">Track and prioritize negotiation issues.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="issue-map" ${a(`issue-map`,`Add and prioritize key issues to resolve.`)}>
              Open Issue Map (${F.length})
            </button>
          </div>
          <div class="card stack-sm">
            <h3>Sessions ${q(`Meeting records with agenda, notes, and attendance.`)}</h3>
            <p class="text-sm color-muted">Record agendas, notes, and participant attendance.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="session" ${a(`session`,`Record session agenda, notes, and attendance.`)}>Session Log (${I.length})</button>
          </div>
          <div class="card stack-sm">
            <h3>Commitments ${q(`Action items with owners and optional due dates.`)}</h3>
            <p class="text-sm color-muted">Track commitments, owners, due dates, and status.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="commitments" ${a(`commitments`,`Track who is responsible for what action.`)}>Open Commitments (${L.length})</button>
          </div>
          <div class="card stack-sm">
            <h3>Follow-Ups ${q(`Future checkpoints used to confirm progress and outcomes.`)}</h3>
            <p class="text-sm color-muted">Schedule and close post-session checkpoints.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="follow-up" ${a(`follow-up`,`Schedule and close follow-up check-ins.`)}>Follow-Up Log (${R.length})</button>
          </div>
          <div class="card stack-sm">
            <h3>Negotiation Pack ${q(`A plain-language summary built from your saved records.`)}</h3>
            <p class="text-sm color-muted">Auto-generate a plain-language case briefing from current records.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="negotiation-pack" ${a(`negotiation-pack`,`Open a plain-language summary of current case readiness.`)}>Open Negotiation Pack</button>
          </div>
          ${M.type===`team-health`?`
            <div class="card stack-sm">
              <h3>Team Health Pack ${q(`A team-focused snapshot of blockers, momentum, and follow-through.`)}</h3>
              <p class="text-sm color-muted">View collaboration signals, focus areas, and practical next actions.</p>
              <button class="btn btn-ghost btn-sm btn-block" data-route="team-health-pack" ${a(`team-health-pack`,`Open team health analysis for this matter.`)}>Open Team Health Pack</button>
            </div>
          `:``}
          ${M.type===`performance-conversation`?`
            <div class="card stack-sm">
              <h3>Performance Conversation Pack ${q(`A coaching snapshot of readiness, priorities, and accountability signals.`)}</h3>
              <p class="text-sm color-muted">Review priority topics, overdue actions, and suggested next facilitation steps.</p>
              <button class="btn btn-ghost btn-sm btn-block" data-route="performance-conversation-pack" ${a(`performance-conversation-pack`,`Open performance conversation insights for this matter.`)}>Open Performance Pack</button>
            </div>
          `:``}
          ${M.type===`change-facilitation`?`
            <div class="card stack-sm">
              <h3>Change Facilitation Pack ${q(`A change snapshot with readiness, risks, and adoption progress indicators.`)}</h3>
              <p class="text-sm color-muted">Review top risks, progress signals, and the most useful next facilitation step.</p>
              <button class="btn btn-ghost btn-sm btn-block" data-route="change-facilitation-pack" ${a(`change-facilitation-pack`,`Open change facilitation insights for this matter.`)}>Open Change Pack</button>
            </div>
          `:``}
          <div class="card stack-sm">
            <h3>Archive ${q(`Downloadable backup packet for retention, transfer, or audit.`)}</h3>
            <p class="text-sm color-muted">Export complete matter packet for offline retention.</p>
            <button class="btn btn-ghost btn-sm btn-block" data-route="export" ${a(`export`,`Download a full matter archive packet.`)}>Export Packet</button>
          </div>
        </aside>
      </div>
    </div>
  `}function Pn(e){return e.length===0?`
      <div class="empty-state">
        <p>No matters found. Create your first matter to get started.</p>
        <button class="btn btn-primary btn-sm" data-route="create-matter" title="Create your first matter and begin the workflow.">Create Matter</button>
      </div>
    `:`
    <div class="list-container card">
      ${e.map(e=>{let t=new Date(e.updatedAt).toLocaleString();return`
        <div class="list-item clickable" data-matter-click="${e.id}" role="button" tabindex="0" aria-label="Open matter ${K(e.title)}. Status ${K(e.status)}. Last updated ${K(t)}.">
          <div class="item-main">
            <span class="item-primary">${K(e.title)}</span>
            <span class="item-secondary">${K(e.type.replace(`-`,` `))}</span>
          </div>
          <div class="item-meta">
            <span class="badge badge-${zt(e.status)}">${K(e.status)}</span>
            <time class="text-sm color-muted" datetime="${K(e.updatedAt)}" title="Last updated ${K(t)}">Updated ${K(t)}</time>
            <button class="btn btn-ghost btn-sm" data-matter-click="${e.id}" title="Open this matter.">Open</button>
          </div>
        </div>
      `}).join(``)}
    </div>
  `}function Fn(e){return e.length===0?`<div class="card p-md color-info"><p>No participants added. Add people to begin intake and consent capture.</p></div>`:`
    <div class="list-container card">
      ${e.map(e=>{let t=e.consent.processConsent&&e.consent.recordConsent;return`
          <div class="list-item" data-participant-id="${e.id}">
            <div class="item-main">
              <span class="item-primary">${K(e.displayName)}</span>
              <span class="item-secondary">${K(e.role)}</span>
            </div>
            <div class="item-meta">
              <span class="consent-indicator ${t?`consented`:`pending`}">
                ${t?`✓ Consented`:`○ Consent Pending`}
              </span>
              ${t?``:`<button class="btn btn-ghost btn-sm" data-action="capture-consent" title="Record consent for local processing and note sharing.">Capture</button>`}
            </div>
          </div>
        `}).join(``)}
    </div>
  `}function In(){let e=!!M;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Workspace preferences and data management.</p>
      </div>
      <div class="settings-grid">
        <section class="settings-section card" aria-labelledby="data-heading">
          <h2 id="data-heading" class="settings-heading">Data Management</h2>
          <div class="settings-row">
            <div>
              <strong>Export selected matter</strong>
              ${M?`<p class="settings-desc">Current selection: <strong>${K(M.title)}</strong></p>`:`<p class="settings-desc">No matter selected. Open a matter first to export it.</p>`}
            </div>
              <button id="export-all-btn" class="btn btn-ghost" data-action="export-matter" ${e?``:`disabled aria-disabled="true"`} title="${e?`Download a full backup packet of the currently selected matter.`:`Open a matter first, then return here to export it.`}">Export Matter</button>
          </div>
          <div class="settings-row">
            <div>
              <strong>Import backup</strong>
              <p class="settings-desc">Restore from a previously exported snapshot.</p>
            </div>
              <button id="import-btn" class="btn btn-ghost" data-action="import-bundle" title="Validate an exported backup file before importing it.">Import</button>
          </div>
        </section>
        <section class="settings-section card" aria-labelledby="recovery-heading">
          <h2 id="recovery-heading" class="settings-heading">Recovery</h2>
          <div class="settings-row">
            <div>
              <strong>Delete one matter</strong>
              <p class="settings-desc">Open the matter first, then use the Delete Matter button on its detail page.</p>
            </div>
            <button class="btn btn-ghost" data-route="matters" title="Open matters list to select and delete a specific matter.">Open Matters</button>
          </div>
          <div class="settings-row">
            <div>
              <strong>Reset cache</strong>
              <p class="settings-desc">Clear service worker cache and reload the app.</p>
            </div>
              <button id="reset-cache-btn" class="btn btn-ghost btn-danger" data-action="reset-cache" title="Clear local app cache and reload. Use this if the app looks out of date.">Reset Cache</button>
          </div>
          <div class="settings-row">
            <div>
              <strong>Factory reset (delete everything)</strong>
              <p class="settings-desc">Permanently deletes all local app data on this device and reloads to first-run state.</p>
            </div>
            <button class="btn btn-danger" data-action="factory-reset" title="Permanently delete all local data for this app on this device.">Factory Reset</button>
          </div>
        </section>
        <details class="settings-section card debug-section">
          <summary class="debug-summary">Debug and Demo Data (collapsed)</summary>
          <div class="debug-body stack-md">
            <p class="settings-desc">Generate a realistic sample workspace state with intake, issues, sessions, commitments, and follow-ups so you can test and demonstrate the app end-to-end.</p>
            <div class="settings-row">
              <div>
                <strong>Populate demo entries</strong>
                <p class="settings-desc">Adds two sample matters: one fully active workflow and one route-out example.</p>
              </div>
              <button class="btn btn-ghost" data-action="populate-demo-data" title="Create realistic sample records so you can explore the full workflow quickly.">Populate Demo Data</button>
            </div>
          </div>
        </details>
      </div>
    </div>
  `}var Ln=[{key:`q1`,label:`Voluntary Participation`,tip:`Everyone involved is choosing to take part freely, without pressure.`},{key:`q2`,label:`No Violence / Manageable Power`,tip:`There is no current violence risk, and any power imbalance can be handled safely.`},{key:`q3`,label:`Capacity / No Crisis`,tip:`People are emotionally and mentally able to participate, and no one is in immediate crisis.`},{key:`q4`,label:`Facilitator/Participant Safety`,tip:`The process can happen without putting facilitators or participants at safety risk.`},{key:`q5`,label:`Mediation Goal Alignment`,tip:`The issue is appropriate for a facilitated process, and the goals fit this method.`},{key:`q6`,label:`No Coercion / Surveillance`,tip:`No one is being forced, monitored, or controlled in a way that undermines consent.`},{key:`q7`,label:`Fair Process Maintenance`,tip:`Ground rules, equal voice, and procedural fairness can be maintained throughout.`},{key:`q8`,label:`Impartiality / No Conflict`,tip:`The facilitator can remain neutral and has no conflict of interest in the outcome.`},{key:`q9`,label:`Parties Speak for Selves`,tip:`Participants can represent their own views directly (or with appropriate supports).`},{key:`q10`,label:`Agreement to Mediate Path`,tip:`All necessary parties agree to follow this process and engage in good faith.`}],Rn=[`crisis`,`coercion`,`safeguarding`,`legal`,`therapy`,`surveillance`];function zn(){return M?`
    <div class="page-container animate-fade-in">
      <div class="page-header text-center">
        <h1 class="page-title">Suitability Assessment</h1>
        <p class="page-subtitle">Mandatory safety and readiness screen for: <strong>${K(M.title)}</strong></p>
      </div>
      
      <div class="card stack-lg max-w-lg mx-auto">
        <form id="suitability-form" class="stack-md">
          <p id="suitability-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <section class="suitability-section">
            <h2 class="section-title">Safety & Readiness Checklist</h2>
            <p class="text-xs color-muted">Tip: hover or tap each <strong>?</strong> icon to see plain-language guidance.</p>
            <details class="debug-section">
              <summary class="debug-summary">What each criterion means (plain language)</summary>
              <div class="debug-body">
                <ul class="stack-sm text-xs color-muted">
                  ${Ln.map(e=>`<li><strong>${K(e.label)}:</strong> ${K(e.tip)}</li>`).join(``)}
                </ul>
              </div>
            </details>
            <div class="checklist-grid grid-2">
              ${Ln.map(e=>`
                <fieldset class="check-item">
                  <legend class="label-with-tip">${K(e.label)} ${q(e.tip)}</legend>
                  <div class="check-options">
                    <label><input type="radio" name="${e.key}" value="yes" required /> Yes</label>
                    <label><input type="radio" name="${e.key}" value="no" required /> No</label>
                  </div>
                </fieldset>
              `).join(``)}
            </div>
          </section>

          <section class="suitability-section border-top pt-md">
            <h2 class="section-title">Facilitator Assessment (Private)</h2>
            <div class="form-group">
              <label class="label-with-tip" for="s-outcome">Overall Suitability Outcome ${q(`Choose the final safety decision after completing the checklist.`)}</label>
              <select id="s-outcome" name="outcome" class="input" required>
                <option value="suitable">Suitable (Proceed to Engagement)</option>
                <option value="conditional">Conditional (Manageable Risks)</option>
                <option value="routed-out">Not Suitable (Route-Out / Safe Exit)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="label-with-tip" for="s-notes">Assessment Rationale ${q(`Briefly explain why you chose this outcome, especially for conditional or route-out decisions.`)}</label>
              <textarea id="s-notes" name="notes" rows="4" maxlength="${U.suitabilityNotes}" placeholder="Record rationale, risk mitigations, or referral plans..." class="input"></textarea>
            </div>
          </section>

          <footer class="suitability-footer">
            <button type="submit" class="btn btn-primary btn-block" title="Save this assessment and apply its outcome to the matter.">Complete & Lock Assessment</button>
            <p class="text-center text-xs color-muted mt-sm italic">By submitting, you certify this assessment adheres to practice standards.</p>
          </footer>
        </form>
      </div>
    </div>
  `:`<div class="empty-state">No matter selected.</div>`}function Bn(){return M?N.length===0?`
      <div class="page-container">
        <div class="empty-state">
          <h2>Intake Needs Participants</h2>
          <p>Add at least one participant before recording intake.</p>
          <button class="btn btn-primary" data-route="matter-detail" title="Return to the selected matter.">Back to Matter</button>
        </div>
      </div>
    `:`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Intake Record</h1>
        <p class="page-subtitle">Structured intake for <strong>${K(M.title)}</strong></p>
      </div>
      <div class="card stack-md">
        <form id="intake-form" class="stack-md">
          <p id="intake-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <div class="form-group">
            <label class="label-with-tip" for="participant-id">Participant ${q(`Select whose intake this record describes.`)}</label>
            <select id="participant-id" name="participantId" class="input" required>
              ${N.map(e=>`
                <option value="${e.id}" ${P?.participantId===e.id?`selected`:``}>${K(e.displayName)}</option>
              `).join(``)}
            </select>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="source">Intake Source ${q(`Where this case came from: self referral, organizational referral, or other.`)}</label>
            <select id="source" name="source" class="input">
              <option value="self" ${P?.source===`self`?`selected`:``}>Self</option>
              <option value="referral" ${P?.source===`referral`?`selected`:``}>Referral</option>
              <option value="organizational" ${P?.source===`organizational`?`selected`:``}>Organizational</option>
              <option value="other" ${P?.source===`other`?`selected`:``}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="notes">Context Notes ${q(`Describe the current situation in plain language.`)}</label>
            <textarea id="notes" name="notes" rows="3" maxlength="${U.intakeNotes}" class="input" placeholder="What is happening now?">${K(String(P?.responses.notes??``))}</textarea>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="desired-outcome">Desired Outcome ${q(`What would a good outcome look like for this person?`)}</label>
            <textarea id="desired-outcome" name="desiredOutcome" rows="3" maxlength="${U.intakeDesiredOutcome}" class="input" placeholder="What outcome does this participant want?">${K(String(P?.responses.desiredOutcome??``))}</textarea>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="constraints">Constraints / Boundaries ${q(`Capture limits, safety boundaries, or practical constraints to respect.`)}</label>
            <textarea id="constraints" name="constraints" rows="3" maxlength="${U.intakeConstraints}" class="input" placeholder="Any constraints, limits, or boundaries?">${K(String(P?.responses.constraints??``))}</textarea>
          </div>
          <section class="suitability-section">
            <h2 class="section-title">Route-Out Risk Flags</h2>
            <div class="checklist-grid">
              ${Rn.map(e=>{let t=P?.riskFlags.find(t=>t.category===e);return`
                  <fieldset class="check-item">
                    <legend>${K(e)}</legend>
                    <label class="check-options">
                      <input type="checkbox" name="risk-${e}" ${t?.triggered?`checked`:``} />
                      <span>Trigger detected</span>
                    </label>
                    <input class="input" type="text" name="risk-note-${e}" maxlength="${U.intakeRiskNote}" placeholder="Optional note" value="${K(t?.note??``)}" />
                  </fieldset>
                `}).join(``)}
            </div>
          </section>
          <div class="form-group">
            <label class="label-with-tip" for="visibility">Visibility ${q(`Facilitator-only is the default. Use private for extra-sensitive notes.`)}</label>
            <select id="visibility" name="visibility" class="input">
              <option value="facilitator" ${P?.visibility===`private`?``:`selected`}>Facilitator-only</option>
              <option value="private" ${P?.visibility===`private`?`selected`:``}>Private</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return without saving intake changes.">Cancel</button>
            <button type="submit" class="btn btn-primary" title="Save this intake record.">Save Intake</button>
          </div>
        </form>
      </div>
    </div>
  `:`<div class="empty-state">No matter selected.</div>`}function Vn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;let e={critical:0,high:1,medium:2,low:3},t=[...F].sort((t,n)=>e[t.priority]-e[n.priority]);return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Issue Map</h1>
        <p class="page-subtitle">Create, prioritize, and refine issues for <strong>${K(M.title)}</strong></p>
      </div>
      <div class="card stack-md">
        <form id="issue-form" class="stack-md">
          <p id="issue-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <div class="form-group">
            <label class="label-with-tip" for="issue-label">Issue Label ${q(`Name the core issue briefly so everyone understands the topic.`)}</label>
            <input id="issue-label" name="label" class="input" type="text" maxlength="${U.issueLabel}" required placeholder="e.g. Workload distribution" />
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="issue-notes">Notes ${q(`Add context, interests, or examples that clarify why this issue matters.`)}</label>
            <textarea id="issue-notes" name="notes" class="input" rows="3" maxlength="${U.issueNotes}" placeholder="Context, stakes, and interests..."></textarea>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="issue-priority">Priority ${q(`Critical means it blocks progress now. Medium/Low can be handled later.`)}</label>
            <select id="issue-priority" name="priority" class="input">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
            <button type="submit" class="btn btn-primary" title="Add this issue to the issue map.">Add Issue</button>
          </div>
        </form>
      </div>

      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Current Issues</h2>
        </div>
        ${t.length===0?`
          <div class="empty-state">
            <p>No issues mapped yet. Add one above to begin prioritization.</p>
          </div>
        `:`
          <div class="list-container">
            ${t.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(e.label)}</span>
                  <span class="item-secondary">${K(e.notes||`No notes yet.`)}</span>
                </div>
                <div class="item-meta">
                  <select class="input" data-action="set-priority" data-issue-id="${e.id}" aria-label="Set issue priority">
                    <option value="critical" ${e.priority===`critical`?`selected`:``}>Critical</option>
                    <option value="high" ${e.priority===`high`?`selected`:``}>High</option>
                    <option value="medium" ${e.priority===`medium`?`selected`:``}>Medium</option>
                    <option value="low" ${e.priority===`low`?`selected`:``}>Low</option>
                  </select>
                  <button class="btn btn-ghost btn-sm" data-action="edit-issue" data-issue-id="${e.id}" title="Edit this issue label and notes.">Edit</button>
                  <button class="btn btn-ghost btn-sm btn-danger" data-action="delete-issue" data-issue-id="${e.id}" title="Delete this issue from the map.">Delete</button>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    </div>
  `}function Hn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;let e=[...I].sort((e,t)=>t.date.localeCompare(e.date));return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Session Record</h1>
        <p class="page-subtitle">Capture agenda, notes, and attendance.</p>
      </div>
      <div class="card stack-md">
        <form id="session-form" class="stack-md">
          <p id="session-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <div class="form-group">
            <label class="label-with-tip" for="session-phase">Phase ${q(`Pick the conversation stage this session belongs to.`)}</label>
            <select id="session-phase" name="phase" class="input">
              <option value="preparation">Preparation</option>
              <option value="introduction">Introduction</option>
              <option value="info-exchange">Info Exchange</option>
              <option value="interest-discovery">Interest Discovery</option>
              <option value="option-generation">Option Generation</option>
              <option value="evaluation">Evaluation</option>
              <option value="agreement">Agreement</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="session-agenda">Agenda (one line per item) ${q(`Write short agenda items, one per line, to guide the session.`)}</label>
            <textarea id="session-agenda" name="agenda" rows="4" maxlength="${U.sessionAgenda}" class="input" required></textarea>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="session-notes">Session Notes ${q(`Capture key facts, agreements, and open questions from the session.`)}</label>
            <textarea id="session-notes" name="notes" rows="4" maxlength="${U.sessionNotes}" class="input"></textarea>
          </div>
          <fieldset class="form-group">
            <legend>Participants Present</legend>
            <div class="checklist-grid">
              ${N.map(e=>`
                <label class="check-options">
                  <input type="checkbox" name="participantIds" value="${e.id}" />
                  <span>${K(e.displayName)}</span>
                </label>
              `).join(``)}
            </div>
          </fieldset>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
            <button type="button" class="btn btn-ghost" data-action="print-page" title="Print this page for offline notes or sharing.">Print</button>
            <button type="submit" class="btn btn-primary" title="Save this session record.">Save Session</button>
          </div>
        </form>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Session Log</h2>
        ${e.length===0?`<div class="empty-state"><p>No sessions recorded yet.</p></div>`:`
          <div class="list-container">
            ${e.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(new Date(e.date).toLocaleString())} · ${K(e.phase.replace(`-`,` `))}</span>
                  <span class="item-secondary">${K(e.notes||`No notes.`)}</span>
                </div>
                <div class="item-meta">
                  <span class="text-sm color-muted">${e.agenda.length} agenda items</span>
                  <button class="btn btn-ghost btn-sm btn-danger" data-action="delete-session" data-session-id="${e.id}" title="Delete this saved session record.">Delete</button>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    </div>
  `}function Un(){if(!M)return`<div class="empty-state">No matter selected.</div>`;let e=[...L].sort((e,t)=>t.updatedAt.localeCompare(e.updatedAt));return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Commitments</h1>
        <p class="page-subtitle">Track follow-through and due dates.</p>
      </div>
      <div class="card stack-md">
        <form id="commitment-form" class="stack-md">
          <p id="commitment-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <div class="form-group">
            <label class="label-with-tip" for="commitment-owner">Owner ${q(`Choose the person responsible for completing this action.`)}</label>
            <select id="commitment-owner" name="ownerId" class="input" required>
              <option value="">Select owner</option>
              ${N.map(e=>`<option value="${e.id}">${K(e.displayName)}</option>`).join(``)}
            </select>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="commitment-text">Commitment ${q(`Describe the action clearly so completion is easy to verify.`)}</label>
            <textarea id="commitment-text" name="text" rows="3" maxlength="${U.commitmentText}" class="input" required></textarea>
          </div>
          <div class="form-group">
            <label class="label-with-tip" for="commitment-due">Due Date ${q(`Optional. Add a date if timing matters for accountability.`)}</label>
            <input id="commitment-due" name="dueDate" type="date" class="input" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
            <button type="button" class="btn btn-ghost" data-action="print-page" title="Print commitments for meetings or follow-up calls.">Print</button>
            <button type="submit" class="btn btn-primary" title="Save this commitment to the matter.">Add Commitment</button>
          </div>
        </form>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Open and Historical Commitments</h2>
        ${e.length===0?`<div class="empty-state"><p>No commitments yet.</p></div>`:`
          <div class="list-container">
            ${e.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(e.text)}</span>
                  <span class="item-secondary">Due: ${K(e.dueDate?new Date(e.dueDate).toLocaleDateString():`Not set`)}</span>
                </div>
                <div class="item-meta">
                  <select class="input" data-action="set-commitment-status" data-commitment-id="${e.id}" aria-label="Set commitment status">
                    <option value="pending" ${e.status===`pending`?`selected`:``}>Pending</option>
                    <option value="in-progress" ${e.status===`in-progress`?`selected`:``}>In Progress</option>
                    <option value="complete" ${e.status===`complete`?`selected`:``}>Complete</option>
                    <option value="cancelled" ${e.status===`cancelled`?`selected`:``}>Cancelled</option>
                  </select>
                  <button class="btn btn-ghost btn-sm btn-danger" data-action="delete-commitment" data-commitment-id="${e.id}" title="Delete this commitment.">Delete</button>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    </div>
  `}function Wn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;let e=[...R].sort((e,t)=>e.targetDate.localeCompare(t.targetDate));return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Follow-Up Log</h1>
        <p class="page-subtitle">Schedule check-ins to review outcomes after sessions.</p>
      </div>
      <div class="card stack-md">
        <form id="followup-form" class="stack-md">
          <p id="followup-error" hidden class="form-error" role="alert" aria-live="assertive"></p>
          <div class="form-group">
            <label class="label-with-tip" for="followup-date">Target Date ${q(`When should you check progress on commitments and agreements?`)}</label>
            <input id="followup-date" name="targetDate" type="date" class="input" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
            <button type="submit" class="btn btn-primary" title="Schedule a new follow-up date.">Schedule Follow-Up</button>
          </div>
        </form>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Scheduled Follow-Ups</h2>
        ${e.length===0?`<div class="empty-state"><p>No follow-ups scheduled yet.</p></div>`:`
          <div class="list-container">
            ${e.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(new Date(e.targetDate).toLocaleDateString())}</span>
                  <span class="item-secondary">${K(e.result||`No outcome recorded yet.`)}</span>
                </div>
                <div class="item-meta">
                  ${e.completedAt?`<span class="badge badge-active">Completed</span>`:`<span class="badge badge-draft">Open</span>`}
                  ${e.completedAt?``:`<button class="btn btn-ghost btn-sm" data-action="complete-followup" data-follow-up-id="${e.id}" title="Record outcome notes and close this follow-up.">Complete</button>`}
                  <button class="btn btn-ghost btn-sm btn-danger" data-action="delete-followup" data-follow-up-id="${e.id}" title="Delete this follow-up entry.">Delete</button>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    </div>
  `}function Gn(){return M?`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Archive Export</h1>
        <p class="page-subtitle">Generate a complete packet for <strong>${K(M.title)}</strong>.</p>
      </div>
      <div class="card stack-md">
        <p class="text-sm color-muted">Packet includes matter, participants, intake, issue map, sessions, commitments, and existing artifacts.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
          <button type="button" class="btn btn-primary" data-action="export-matter" title="Download a complete export packet for this matter.">Export Matter Packet</button>
        </div>
      </div>
    </div>
  `:`<div class="empty-state">No matter selected.</div>`}function Kn(){return M?!z||z.matterId!==M.id?`
      <div class="page-container">
        <div class="card stack-md">
          <h1 class="page-title">Negotiation Pack</h1>
          <p class="page-subtitle">Preparing your briefing...</p>
        </div>
      </div>
    `:`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Negotiation Pack</h1>
        <p class="page-subtitle">Quick plain-language briefing for <strong>${K(z.summary.matterTitle)}</strong></p>
      </div>
      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Snapshot ${q(`A quick summary of where this case stands right now.`)}</h2>
          <span class="text-sm color-muted">Generated ${new Date(z.generatedAt).toLocaleString()}</span>
        </div>
        <p><strong>Matter type:</strong> ${K(z.summary.matterType)}</p>
        <p><strong>Participants:</strong> ${z.summary.participantCount}</p>
        <p><strong>Sessions logged:</strong> ${z.summary.sessionCount}</p>
        <p><strong>Suitability:</strong> ${K(z.readiness.suitabilityState)}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Readiness ${q(`Tracks whether key records are complete enough to proceed confidently.`)}</h2>
        <p><strong>Intake captured:</strong> ${z.readiness.intakePresent?`Yes`:`No`}</p>
        <p><strong>Open commitments:</strong> ${z.readiness.openCommitments}</p>
        <p><strong>Open follow-ups:</strong> ${z.readiness.openFollowUps}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Top Issues ${q(`Highest-priority topics to address first in the next conversation.`)}</h2>
        ${z.keyIssues.length===0?`<p class="color-muted">No issues mapped yet.</p>`:`
          <div class="list-container">
            ${z.keyIssues.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(e.label)}</span>
                  <span class="item-secondary">${K(e.notes||`No notes yet.`)}</span>
                </div>
                <div class="item-meta">
                  <span class="badge badge-${zt(e.priority)}">${K(e.priority)}</span>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Agenda Highlights ${q(`Key agenda points recently discussed in logged sessions.`)}</h2>
        ${z.recentAgendaHighlights.length===0?`<p class="color-muted">No session agenda items yet.</p>`:`
          <ul>
            ${z.recentAgendaHighlights.map(e=>`<li>${K(e)}</li>`).join(``)}
          </ul>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Suggested Next Step ${q(`One practical action to move the case forward this week.`)}</h2>
        <p>${K(z.nextAction)}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
          <button type="button" class="btn btn-ghost" data-action="refresh-negotiation-pack" title="Regenerate this briefing using the latest records.">Refresh Pack</button>
        </div>
      </div>
    </div>
  `:`<div class="empty-state">No matter selected.</div>`}function qn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;if(!B||B.matterId!==M.id)return`
      <div class="page-container">
        <div class="card stack-md">
          <h1 class="page-title">Team Health Pack</h1>
          <p class="page-subtitle">Preparing your team health snapshot...</p>
        </div>
      </div>
    `;let e=B.summary.collaborationPulse>=80?`Strong`:B.summary.collaborationPulse>=60?`Stable`:`Needs Attention`;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Team Health Pack</h1>
        <p class="page-subtitle">Read-only team collaboration snapshot for <strong>${K(B.summary.matterTitle)}</strong></p>
      </div>
      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Pulse ${q(`A simple score based on blockers, follow-through, and active session records.`)}</h2>
          <span class="text-sm color-muted">Generated ${new Date(B.generatedAt).toLocaleString()}</span>
        </div>
        <p><strong>Collaboration pulse:</strong> ${B.summary.collaborationPulse}/100 (${e})</p>
        <p><strong>Participants:</strong> ${B.summary.participantCount}</p>
        <p><strong>Sessions logged:</strong> ${B.summary.sessionCount}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Signals ${q(`Risk and momentum indicators to help decide what to address next.`)}</h2>
        <p><strong>Critical blockers:</strong> ${B.signals.criticalIssues}</p>
        <p><strong>High-priority blockers:</strong> ${B.signals.highIssues}</p>
        <p><strong>Open commitments:</strong> ${B.signals.openCommitments}</p>
        <p><strong>Completed commitments:</strong> ${B.signals.completedCommitments}</p>
        <p><strong>Open follow-ups:</strong> ${B.signals.openFollowUps}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Focus Areas ${q(`Top topics currently influencing team health.`)}</h2>
        ${B.focusAreas.length===0?`<p class="color-muted">No focus areas yet. Add issues to build this section.</p>`:`
          <ul>
            ${B.focusAreas.map(e=>`<li>${K(e)}</li>`).join(``)}
          </ul>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Recent Wins ${q(`Completed commitments that indicate positive momentum.`)}</h2>
        ${B.recentWins.length===0?`<p class="color-muted">No completed commitments yet.</p>`:`
          <ul>
            ${B.recentWins.map(e=>`<li>${K(e)}</li>`).join(``)}
          </ul>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Suggested Next Step ${q(`One concrete action likely to improve team health this week.`)}</h2>
        <p>${K(B.nextAction)}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
          <button type="button" class="btn btn-ghost" data-action="refresh-team-health-pack" title="Regenerate this team health snapshot from latest records.">Refresh Team Health Pack</button>
        </div>
      </div>
    </div>
  `}function Jn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;if(!V||V.matterId!==M.id)return`
      <div class="page-container">
        <div class="card stack-md">
          <h1 class="page-title">Performance Conversation Pack</h1>
          <p class="page-subtitle">Preparing your coaching snapshot...</p>
        </div>
      </div>
    `;let e=V.summary.conversationReadiness>=80?`Strong`:V.summary.conversationReadiness>=60?`Stable`:`Needs Attention`;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Performance Conversation Pack</h1>
        <p class="page-subtitle">Read-only coaching snapshot for <strong>${K(V.summary.matterTitle)}</strong></p>
      </div>
      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Readiness ${q(`A simple score showing whether the conversation setup is clear, timely, and actionable.`)}</h2>
          <span class="text-sm color-muted">Generated ${new Date(V.generatedAt).toLocaleString()}</span>
        </div>
        <p><strong>Conversation readiness:</strong> ${V.summary.conversationReadiness}/100 (${e})</p>
        <p><strong>Participants:</strong> ${V.summary.participantCount}</p>
        <p><strong>Sessions logged:</strong> ${V.summary.sessionCount}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Signals ${q(`Indicators that reveal urgency, risk, and accountability gaps.`)}</h2>
        <p><strong>Intake captured:</strong> ${V.signals.intakePresent?`Yes`:`No`}</p>
        <p><strong>Critical topics:</strong> ${V.signals.criticalTopics}</p>
        <p><strong>High-priority topics:</strong> ${V.signals.highTopics}</p>
        <p><strong>Open commitments:</strong> ${V.signals.openCommitments}</p>
        <p><strong>Overdue commitments:</strong> ${V.signals.overdueCommitments}</p>
        <p><strong>Open follow-ups:</strong> ${V.signals.openFollowUps}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Priority Topics ${q(`The highest-priority items to address first in the next conversation.`)}</h2>
        ${V.priorityTopics.length===0?`<p class="color-muted">No priority topics yet. Add issue-map topics to populate this section.</p>`:`
          <div class="list-container">
            ${V.priorityTopics.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(e.label)}</span>
                </div>
                <div class="item-meta">
                  <span class="badge badge-${zt(e.priority)}">${K(e.priority)}</span>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Recent Strengths ${q(`Completed commitments that show positive momentum and follow-through.`)}</h2>
        ${V.strengths.length===0?`<p class="color-muted">No completed commitments captured yet.</p>`:`
          <ul>
            ${V.strengths.map(e=>`<li>${K(e)}</li>`).join(``)}
          </ul>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Suggested Next Step ${q(`One practical step to improve the next coaching conversation.`)}</h2>
        <p>${K(V.nextAction)}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
          <button type="button" class="btn btn-ghost" data-action="refresh-performance-conversation-pack" title="Regenerate this coaching snapshot from latest records.">Refresh Performance Pack</button>
        </div>
      </div>
    </div>
  `}function Yn(){if(!M)return`<div class="empty-state">No matter selected.</div>`;if(!H||H.matterId!==M.id)return`
      <div class="page-container">
        <div class="card stack-md">
          <h1 class="page-title">Change Facilitation Pack</h1>
          <p class="page-subtitle">Preparing your change snapshot...</p>
        </div>
      </div>
    `;let e=H.summary.changeReadiness>=80?`Strong`:H.summary.changeReadiness>=60?`Stable`:`Needs Attention`;return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Change Facilitation Pack</h1>
        <p class="page-subtitle">Read-only change snapshot for <strong>${K(H.summary.matterTitle)}</strong></p>
      </div>
      <div class="card stack-md">
        <div class="section-header">
          <h2 class="section-title">Readiness ${q(`A simple score that reflects change preparation, risk level, and follow-through.`)}</h2>
          <span class="text-sm color-muted">Generated ${new Date(H.generatedAt).toLocaleString()}</span>
        </div>
        <p><strong>Change readiness:</strong> ${H.summary.changeReadiness}/100 (${e})</p>
        <p><strong>Participants:</strong> ${H.summary.participantCount}</p>
        <p><strong>Sessions logged:</strong> ${H.summary.sessionCount}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Signals ${q(`Indicators for facilitation risk, ownership load, and adoption momentum.`)}</h2>
        <p><strong>Intake captured:</strong> ${H.signals.intakePresent?`Yes`:`No`}</p>
        <p><strong>Critical risks:</strong> ${H.signals.criticalRisks}</p>
        <p><strong>High-priority risks:</strong> ${H.signals.highRisks}</p>
        <p><strong>Open commitments:</strong> ${H.signals.openCommitments}</p>
        <p><strong>Completed commitments:</strong> ${H.signals.completedCommitments}</p>
        <p><strong>Open follow-ups:</strong> ${H.signals.openFollowUps}</p>
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Top Risks ${q(`Highest-priority risks to review first in the next facilitation session.`)}</h2>
        ${H.topRisks.length===0?`<p class="color-muted">No risk topics yet. Add issue-map topics to populate this section.</p>`:`
          <div class="list-container">
            ${H.topRisks.map(e=>`
              <div class="list-item">
                <div class="item-main">
                  <span class="item-primary">${K(e.label)}</span>
                </div>
                <div class="item-meta">
                  <span class="badge badge-${zt(e.priority)}">${K(e.priority)}</span>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Progress Signals ${q(`Completed commitments that indicate the change is moving forward.`)}</h2>
        ${H.progressSignals.length===0?`<p class="color-muted">No completed commitments captured yet.</p>`:`
          <ul>
            ${H.progressSignals.map(e=>`<li>${K(e)}</li>`).join(``)}
          </ul>
        `}
      </div>
      <div class="card stack-md">
        <h2 class="section-title">Suggested Next Step ${q(`One concrete facilitation action most likely to improve change progress this week.`)}</h2>
        <p>${K(H.nextAction)}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-route="matter-detail" title="Return to matter overview.">Back</button>
          <button type="button" class="btn btn-ghost" data-action="refresh-change-facilitation-pack" title="Regenerate this change snapshot from latest records.">Refresh Change Pack</button>
        </div>
      </div>
    </div>
  `}var Xn=`modulepreload`,Zn=function(e){return`./`+e},Qn={},$n=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=Zn(t,n),t in Qn)return;Qn[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:Xn,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},er=`true`,tr=`false`,nr=er===`true`,rr=tr===`true`;function ir(e={}){let{immediate:t=!1,onNeedRefresh:n,onOfflineReady:r,onRegistered:i,onRegisteredSW:a,onRegisterError:o}=e,s,c,l,u=async(e=!0)=>{await c,nr||l?.()};async function d(){if(`serviceWorker`in navigator){if(s=await $n(async()=>{let{Workbox:e}=await import(`./workbox-window.prod.es5-Bq4GJJid.js`);return{Workbox:e}},[]).then(({Workbox:e})=>new e(`./sw.js`,{scope:`./`,type:`classic`})).catch(e=>{o?.(e)}),!s)return;if(l=()=>{s?.messageSkipWaiting()},!rr)if(nr)s.addEventListener(`activated`,e=>{(e.isUpdate||e.isExternal)&&window.location.reload()}),s.addEventListener(`installed`,e=>{e.isUpdate||r?.()});else{let e=!1,t=()=>{e=!0,s?.addEventListener(`controlling`,e=>{e.isUpdate&&window.location.reload()}),n?.()};s.addEventListener(`installed`,n=>{n.isUpdate===void 0?n.isExternal===void 0?!e&&r?.():n.isExternal?t():!e&&r?.():n.isUpdate||r?.()}),s.addEventListener(`waiting`,t)}s.register({immediate:t}).then(e=>{a?a(`./sw.js`,e):i?.(e)}).catch(e=>{o?.(e)})}}return c=d(),u}var ar=document.getElementById(`app`);if(!ar)throw Error(`#app element not found`);var or=`cg.notice.postReload`;function sr(e){sessionStorage.setItem(or,JSON.stringify({tone:`info`,message:e}))}async function cr(e){try{if(!e){sr(`App refreshed to ensure you are on the latest version.`),location.reload();return}let t=!1;navigator.serviceWorker?.addEventListener(`controllerchange`,()=>{t=!0,sr(`Update installed. You are now on the latest version.`),location.reload()},{once:!0}),await e(!0),await new Promise(e=>setTimeout(e,1400)),t||(sr(`Update applied. Reloading to finalize.`),location.reload())}catch{sr(`Update check completed. Reloading to ensure latest assets.`),location.reload()}}async function lr(){try{await p()}catch(e){console.error(`[Bootstrap] DB open failed:`,e?.message||"Unknown error"),ur(ar,`Database unavailable. Try refreshing or clearing site data.`);return}await Vt(ar);let e,t=!1;e=ir({immediate:!0,onNeedRefresh(){t=!0,cr(e)},onOfflineReady(){console.info(`[SW] App is ready for offline use.`)}}),t&&cr(e)}function ur(e,t){e.innerHTML=`
    <div class="error-screen" role="alert" aria-live="assertive">
      <div class="error-card">
        <h1>COMMONGROUND Suite</h1>
        <p class="error-msg">${t}</p>
        <button id="reload-btn" class="btn btn-primary">Reload</button>
      </div>
    </div>
  `;let n=e.querySelector(`#reload-btn`);n&&n.addEventListener(`click`,()=>location.reload())}lr().catch(e=>console.error(e?.message||"Unknown error"));