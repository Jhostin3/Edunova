import{r as e}from"./index-CCITJ0gF.js";import{r as t}from"./periodoService-C6Q9UHMT.js";import{n}from"./tarjetaService-BVkaiafX.js";function r(e,t){return e?.context?.msg||e?.context?.error||e?.context?.message||e?.message||t}async function i(){let{data:t,error:n}=await e.from(`estudiante_curso`).select(`
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado,
      curso:cursos (
        id,
        nombre,
        nivel,
        paralelo,
        especialidad
      )
    `).eq(`estado`,!0);if(n)return{data:new Map,error:n};let r=new Map;for(let e of t??[])r.set(e.estudiante_id,e);return{data:r,error:null}}async function a(t){if(!t?.length)return{data:new Map,error:null};let{data:n,error:r}=await e.from(`tarjetas_nfc`).select(`id, uid_nfc, estudiante_id, is_active, fecha_asignacion`).in(`estudiante_id`,t).eq(`is_active`,!0);return r?{data:new Map,error:r}:{data:new Map((n??[]).map(e=>[e.estudiante_id,e])),error:null}}async function o(t,n){if(!n)return{data:null,error:null};let{data:r,error:i}=await e.from(`estudiante_curso`).select(`
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado
    `).eq(`estudiante_id`,t).limit(1).maybeSingle();if(i)return{data:null,error:i};let a={estudiante_id:t,curso_id:n,fecha_asignacion:new Date().toISOString(),estado:!0};if(r?.id){let{data:t,error:n}=await e.from(`estudiante_curso`).update(a).eq(`id`,r.id).select().single();return{data:t,error:n}}let{data:o,error:s}=await e.from(`estudiante_curso`).insert(a).select().single();return{data:o,error:s}}async function s(t,n){if(!t||!n)return{data:null,error:null};let{data:r,error:i}=await e.from(`estudiante_representante`).upsert({estudiante_id:t,representante_id:n,es_principal:!0},{onConflict:`estudiante_id,representante_id`}).select().maybeSingle();return{data:r,error:i}}async function c(t){if(!t)return{data:null,error:null};let{data:n,error:r}=await e.from(`cursos`).select(`
      id,
      periodo_id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      periodo:periodos_escolares (
        id,
        nombre,
        activo
      )
    `).eq(`id`,t).maybeSingle();return{data:n,error:r}}async function l(t){if(!t)return{data:[],error:null};let{data:n,error:r}=await e.from(`cursos`).select(`id`).eq(`periodo_id`,t);return{data:(n??[]).map(e=>e.id),error:r}}async function u(t,n){if(!n)return{data:null,error:null};let{data:r,error:i}=await c(n);if(i)return{data:null,error:i};if(!r?.periodo_id)return{data:null,error:Error(`El curso seleccionado no tiene periodo asociado.`)};let{data:a,error:o}=await l(r.periodo_id);if(o)return{data:null,error:o};if(a.length){let{error:r}=await e.from(`estudiante_curso`).update({estado:!1}).eq(`estudiante_id`,t).in(`curso_id`,a).neq(`curso_id`,n);if(r)return{data:null,error:r}}let{data:s,error:u}=await e.from(`estudiante_curso`).select(`id`).eq(`estudiante_id`,t).eq(`curso_id`,n).maybeSingle();if(u)return{data:null,error:u};let d={estudiante_id:t,curso_id:n,fecha_asignacion:new Date().toISOString(),estado:!0};if(s?.id){let{data:t,error:n}=await e.from(`estudiante_curso`).update(d).eq(`id`,s.id).select().single();return{data:t,error:n}}let{data:f,error:p}=await e.from(`estudiante_curso`).insert(d).select().single();return{data:f,error:p}}function d(e){return{nombres:e.nombres?.trim()??``,apellidos:e.apellidos?.trim()??``,tipo_identificacion:e.tipo_identificacion||`cedula_ecuatoriana`,cedula:e.cedula?.trim()??``,fecha_nacimiento:e.fecha_nacimiento||null,genero:e.genero||null,direccion:e.direccion?.trim()||null,estado:!!e.estado,representante_principal_id:e.representante_principal_id||null}}async function f(t){let{data:n,error:i}=await e.functions.invoke(`create-student-account`,{body:{...d(t),curso_id:t.curso_id||null}});return i?{data:null,error:Error(r(i,`No se pudo crear la cuenta institucional del estudiante.`))}:n?.student?.id?{data:n,error:null}:{data:null,error:Error(`La funcion no devolvio un estudiante valido.`)}}async function p(){let{data:t,error:n}=await e.from(`estudiantes`).select(`
      id,
      user_id,
      representante_principal_id,
      codigo_estudiante,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      direccion,
      estado,
      correo_institucional,
      cuenta_creada,
      foto_rostro_url,
      rostro_registrado,
      created_at,
      updated_at,
      representante_principal:representantes!estudiantes_representante_principal_id_fkey (
        id,
        nombres,
        apellidos,
        relacion
      )
    `).order(`created_at`,{ascending:!1});if(n)return{data:[],error:n};let{data:r,error:o}=await i();if(o)return{data:[],error:o};let{data:s,error:c}=await a((t??[]).map(e=>e.id));return c?{data:[],error:c}:{data:(t??[]).map(e=>{let t=r.get(e.id)??null,n=s.get(e.id)??null;return{...e,curso_actual:t?.curso??null,curso_id:t?.curso_id??``,curso_asignacion_id:t?.id??null,tarjeta_activa:n,nfc_asignada:!!n,listo_asistencia:!!(t&&n&&e.rostro_registrado)}}),error:null}}async function m(e){let{data:t,error:n}=await f(e);if(n||!t?.student?.id)return{data:t,error:n};let{error:r}=await s(t.student.id,e.representante_principal_id);return r?{data:t,error:r}:{data:t,error:null}}async function h(){let{data:n,error:r}=await t();if(r)return{data:[],periodo:null,error:r};if(!n?.id)return{data:[],periodo:null,error:Error(`No existe un periodo lectivo activo.`)};let{data:i,error:a}=await e.from(`cursos`).select(`
      id,
      periodo_id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `).eq(`periodo_id`,n.id).eq(`estado`,!0).order(`nombre`,{ascending:!0});return{data:i??[],periodo:n,error:a}}async function g(t){let r=String(t??``).trim();if(!r)return{data:null,error:null};let{data:i,error:a}=await e.from(`estudiantes`).select(`
      id,
      user_id,
      representante_principal_id,
      codigo_estudiante,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      direccion,
      estado,
      correo_institucional,
      cuenta_creada,
      foto_rostro_url,
      rostro_registrado,
      created_at,
      updated_at,
      representante_principal:representantes!estudiantes_representante_principal_id_fkey (
        id,
        nombres,
        apellidos,
        tipo_identificacion,
        cedula,
        relacion,
        telefono,
        email,
        whatsapp,
        direccion,
        estado
      )
    `).eq(`cedula`,r).maybeSingle();if(a||!i)return{data:i??null,error:a};let[o,s,c]=await Promise.all([_(i.id),v(i.id),n(i.id)]);return o.error?{data:null,error:o.error}:s.error?{data:null,error:s.error}:c.error?{data:null,error:c.error}:{data:{...i,historial_academico:o.data,estado_operativo:s.data,tarjetas_nfc:c.data},error:null}}async function _(t){if(!t)return{data:[],error:null};let{data:n,error:r}=await e.from(`estudiante_curso`).select(`
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado,
      curso:cursos (
        id,
        nombre,
        nivel,
        paralelo,
        especialidad,
        periodo_id,
        periodo:periodos_escolares (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          activo
        )
      )
    `).eq(`estudiante_id`,t).order(`fecha_asignacion`,{ascending:!1});return{data:n??[],error:r}}async function v(r){if(!r)return{data:null,error:null};let{data:i,error:a}=await t();if(a)return{data:null,error:a};let{data:o,error:s}=await e.from(`estudiantes`).select(`id, rostro_registrado, foto_rostro_url`).eq(`id`,r).maybeSingle();if(s)return{data:null,error:s};let{data:c,error:u}=await n(r);if(u)return{data:null,error:u};let d=i?.id?await l(i.id):{data:[],error:null};if(d.error)return{data:null,error:d.error};let f=null;if(d.data.length){let{data:t,error:n}=await e.from(`estudiante_curso`).select(`id, curso_id, estado, fecha_asignacion`).eq(`estudiante_id`,r).in(`curso_id`,d.data).eq(`estado`,!0).limit(1).maybeSingle();if(n)return{data:null,error:n};f=t??null}let p=(c??[]).find(e=>e.is_active)??null,m=!!o?.rostro_registrado;return{data:{periodo_activo:i,matricula_completada:!!f,matricula_actual:f,nfc_asignada:!!p,tarjeta_activa:p,rostro_registrado:m,foto_rostro_url:o?.foto_rostro_url??null,listo_asistencia:!!(f&&p&&m)},error:null}}async function y(t,r){let i=d(r),{data:a,error:o}=await e.from(`estudiantes`).update(i).eq(`id`,t).select().single();if(o)return{data:null,error:o};let{error:c}=await s(t,i.representante_principal_id);if(c)return{data:null,error:c};let{error:l}=await u(t,r.curso_id);if(l)return{data:null,error:l};let[f,p,m]=await Promise.all([_(t),v(t),n(t)]);return f.error?{data:null,error:f.error}:p.error?{data:null,error:p.error}:m.error?{data:null,error:m.error}:{data:{student:a,historial_academico:f.data,estado_operativo:p.data,tarjetas_nfc:m.data},error:null}}async function b(){let{data:t,error:n}=await e.from(`representantes`).select(`
      id,
      nombres,
      apellidos,
      tipo_identificacion,
      relacion,
      estado
    `).eq(`estado`,!0).order(`nombres`,{ascending:!0});return{data:t??[],error:n}}async function x(){let{data:t,error:n}=await e.from(`cursos`).select(`
      id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `).eq(`estado`,!0).order(`nombre`,{ascending:!0});return{data:t??[],error:n}}async function S(t,n){let r=d(n),{data:i,error:a}=await e.from(`estudiantes`).update(r).eq(`id`,t).select().single();if(a)return{data:i,error:a};let{error:s}=await o(t,n.curso_id);return s?{data:i,error:s}:{data:i,error:null}}export{p as a,S as c,x as i,g as n,b as o,h as r,y as s,m as t};