import{r as e}from"./index-Bi8JBEUJ.js";var t=[{value:1,label:`Lunes`},{value:2,label:`Martes`},{value:3,label:`Miercoles`},{value:4,label:`Jueves`},{value:5,label:`Viernes`},{value:6,label:`Sabado`},{value:7,label:`Domingo`}];function n(e){return t.find(t=>Number(t.value)===Number(e))?.label??`-`}function r(e){if(!e)return`-`;let[t=`00`,n=`00`]=String(e).split(`:`);return`${t.padStart(2,`0`)}:${n.padStart(2,`0`)}`}function i(e){return e?.length?e.map(e=>n(e)).join(`, `):`Sin dias`}function a(e,t){return{nombre:e.nombre?.trim()??``,descripcion:e.descripcion?.trim()||null,coordinador_id:t,hora_inicio:e.hora_inicio||null,hora_fin:e.hora_fin||null,estado:!!e.estado,modo_asistencia:e.modo_asistencia,dias_minimos_requeridos:e.modo_asistencia===`dias_seleccionables`?Number(e.dias_minimos_requeridos):null}}async function o(t,n){let{error:r}=await e.from(`club_dias`).delete().eq(`club_id`,t);if(r)return{data:null,error:r};if(!n?.length)return{data:[],error:null};let i=n.map(e=>({club_id:t,dia_semana:Number(e)})),{data:a,error:o}=await e.from(`club_dias`).insert(i).select();return{data:a??[],error:o}}async function s(t){if(!t?.length)return{data:new Map,error:null};let{data:n,error:r}=await e.from(`club_dias`).select(`
      id,
      club_id,
      dia_semana
    `).in(`club_id`,t).order(`dia_semana`,{ascending:!0});if(r)return{data:new Map,error:r};let i=new Map;for(let e of n??[]){let t=i.get(e.club_id)??[];t.push(Number(e.dia_semana)),i.set(e.club_id,t)}return{data:i,error:null}}async function c(t){if(!t?.length)return{data:new Map,error:null};let{data:n,error:r}=await e.from(`estudiante_club`).select(`
      id,
      club_id,
      activo
    `).in(`club_id`,t).eq(`activo`,!0);if(r)return{data:new Map,error:r};let i=new Map;for(let e of n??[])i.set(e.club_id,(i.get(e.club_id)??0)+1);return{data:i,error:null}}async function l(t){let{data:n,error:r}=await e.from(`clubes`).select(`
      id,
      nombre,
      descripcion,
      coordinador_id,
      hora_inicio,
      hora_fin,
      estado,
      modo_asistencia,
      dias_minimos_requeridos,
      created_at,
      updated_at
    `).eq(`coordinador_id`,t).order(`updated_at`,{ascending:!1});if(r)return{data:[],error:r};let i=n??[],a=i.map(e=>e.id),[{data:o,error:l},{data:u,error:d}]=await Promise.all([s(a),c(a)]);return l?{data:[],error:l}:d?{data:[],error:d}:{data:i.map(e=>({...e,dias:o.get(e.id)??[],inscritos_count:u.get(e.id)??0})),error:null}}async function u(t,n){let r=e.from(`clubes`).select(`
      id,
      nombre,
      descripcion,
      coordinador_id,
      hora_inicio,
      hora_fin,
      estado,
      modo_asistencia,
      dias_minimos_requeridos,
      created_at,
      updated_at
    `).eq(`id`,t);n&&(r=r.eq(`coordinador_id`,n));let{data:i,error:a}=await r.single();if(a)return{data:null,error:a};let[{data:o,error:l},{data:u,error:d}]=await Promise.all([s([t]),c([t])]);return l?{data:null,error:l}:d?{data:null,error:d}:{data:{...i,dias:o.get(t)??[],inscritos_count:u.get(t)??0},error:null}}async function d(t,n,r){let i=a(t,r),{data:s,error:c}=await e.from(`clubes`).insert(i).select().single();if(c||!s?.id)return{data:s,error:c};let{error:l}=await o(s.id,n);return l?{data:s,error:l}:u(s.id,r)}async function f(t,n,r,i){let s=a(n,i),{data:c,error:l}=await e.from(`clubes`).update(s).eq(`id`,t).eq(`coordinador_id`,i).select().single();if(l)return{data:c,error:l};let{error:d}=await o(t,r);return d?{data:c,error:d}:u(t,i)}async function p(e){let{data:t,error:n}=await l(e);return n?{data:null,error:n}:{data:{totalClubes:t.length,totalInscritos:t.reduce((e,t)=>e+(t.inscritos_count??0),0),activos:t.filter(e=>e.estado===!0).length,clubs:t},error:null}}export{u as a,l as c,r as i,f as l,d as n,n as o,i as r,p as s,t};