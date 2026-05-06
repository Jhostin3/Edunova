import{r as e}from"./index-Bi8JBEUJ.js";function t(e,t){return e?.context?.msg||e?.context?.error||e?.context?.message||e?.message||t}async function n(){let{data:t,error:n}=await e.from(`estudiante_curso`).select(`
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
    `).eq(`estado`,!0);if(n)return{data:new Map,error:n};let r=new Map;for(let e of t??[])r.set(e.estudiante_id,e);return{data:r,error:null}}async function r(t,n){if(!n)return{data:null,error:null};let{data:r,error:i}=await e.from(`estudiante_curso`).select(`
      id,
      estudiante_id,
      curso_id,
      fecha_asignacion,
      estado
    `).eq(`estudiante_id`,t).limit(1).maybeSingle();if(i)return{data:null,error:i};let a={estudiante_id:t,curso_id:n,fecha_asignacion:new Date().toISOString(),estado:!0};if(r?.id){let{data:t,error:n}=await e.from(`estudiante_curso`).update(a).eq(`id`,r.id).select().single();return{data:t,error:n}}let{data:o,error:s}=await e.from(`estudiante_curso`).insert(a).select().single();return{data:o,error:s}}function i(e){return{nombres:e.nombres?.trim()??``,apellidos:e.apellidos?.trim()??``,tipo_identificacion:e.tipo_identificacion||`cedula_ecuatoriana`,cedula:e.cedula?.trim()??``,fecha_nacimiento:e.fecha_nacimiento||null,genero:e.genero||null,direccion:e.direccion?.trim()||null,estado:!!e.estado,representante_principal_id:e.representante_principal_id||null}}async function a(n){let{data:r,error:a}=await e.functions.invoke(`create-student-account`,{body:{...i(n),curso_id:n.curso_id||null}});return a?{data:null,error:Error(t(a,`No se pudo crear la cuenta institucional del estudiante.`))}:r?.student?.id?{data:r,error:null}:{data:null,error:Error(`La funcion no devolvio un estudiante valido.`)}}async function o(){let{data:t,error:r}=await e.from(`estudiantes`).select(`
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
      created_at,
      updated_at,
      representante_principal:representantes!estudiantes_representante_principal_id_fkey (
        id,
        nombres,
        apellidos,
        relacion
      )
    `).order(`created_at`,{ascending:!1});if(r)return{data:[],error:r};let{data:i,error:a}=await n();return a?{data:[],error:a}:{data:(t??[]).map(e=>{let t=i.get(e.id)??null;return{...e,curso_actual:t?.curso??null,curso_id:t?.curso_id??``,curso_asignacion_id:t?.id??null}}),error:null}}async function s(e){let{data:t,error:n}=await a(e);return n||!t?.student?.id?{data:t,error:n}:{data:t,error:null}}async function c(){let{data:t,error:n}=await e.from(`representantes`).select(`
      id,
      nombres,
      apellidos,
      tipo_identificacion,
      relacion,
      estado
    `).eq(`estado`,!0).order(`nombres`,{ascending:!0});return{data:t??[],error:n}}async function l(){let{data:t,error:n}=await e.from(`cursos`).select(`
      id,
      nombre,
      nivel,
      paralelo,
      especialidad,
      estado
    `).eq(`estado`,!0).order(`nombre`,{ascending:!0});return{data:t??[],error:n}}async function u(t,n){let a=i(n),{data:o,error:s}=await e.from(`estudiantes`).update(a).eq(`id`,t).select().single();if(s)return{data:o,error:s};let{error:c}=await r(t,n.curso_id);return c?{data:o,error:c}:{data:o,error:null}}export{u as a,c as i,l as n,o as r,s as t};