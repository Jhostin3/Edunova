import{r as e}from"./index-CCITJ0gF.js";function t(e){if(!e)return`-`;let t=new Date(`${e}T00:00:00`);return Number.isNaN(t.getTime())?e:new Intl.DateTimeFormat(`es-EC`,{day:`2-digit`,month:`2-digit`,year:`numeric`}).format(t)}async function n(t){let{data:n,error:r}=await e.from(`personal`).select(`
      id,
      user_id,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      correo_institucional,
      cuenta_creada,
      estado,
      created_at,
      updated_at
    `).eq(`user_id`,t).maybeSingle();if(r)return{data:null,error:r};if(!n)return{data:null,error:Error(`No se encontro un miembro del personal asociado a esta cuenta.`)};let{data:i,error:a}=await e.from(`profiles`).select(`
      id,
      email,
      rol_id,
      estado,
      rol:roles!profiles_rol_id_fkey (
        id,
        nombre
      )
    `).eq(`id`,t).maybeSingle();return a?{data:null,error:a}:{data:{personal:n,profile:{...i,rol:Array.isArray(i?.rol)?i.rol[0]??null:i?.rol??null}},error:null}}async function r(t){return e?n(t):{data:null,error:Error(`Supabase no esta configurado.`)}}async function i(t,n,r){if(!e)return{data:null,error:Error(`Supabase no esta configurado.`)};let i={nombres:r.nombres?.trim()??``,apellidos:r.apellidos?.trim()??``,tipo_identificacion:r.tipo_identificacion||`cedula_ecuatoriana`,cedula:r.cedula?.trim()??``,fecha_nacimiento:r.fecha_nacimiento||null,telefono:r.telefono?.trim()||null,estado:!!r.estado},{data:a,error:o}=await e.from(`personal`).update(i).eq(`id`,n).eq(`user_id`,t).select(`
      id,
      user_id,
      tipo_identificacion,
      cedula,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      correo_institucional,
      cuenta_creada,
      estado
    `).single();if(o)return{data:null,error:o};let{error:s}=await e.from(`profiles`).update({nombres:i.nombres,apellidos:i.apellidos,cedula:i.cedula,tipo_identificacion:i.tipo_identificacion,fecha_nacimiento:i.fecha_nacimiento,telefono:i.telefono,estado:i.estado}).eq(`id`,t);return s?{data:null,error:s}:{data:a,error:null}}async function a({email:t,currentPassword:n,nextPassword:r}){if(!e)return{data:null,error:Error(`Supabase no esta configurado.`)};let i=String(t??``).trim();if(!i)return{data:null,error:Error(`No se encontro el correo institucional de esta cuenta.`)};let{error:a}=await e.auth.signInWithPassword({email:i,password:n});if(a)return{data:null,error:Error(`La contrasena actual es incorrecta.`)};let{data:o,error:s}=await e.auth.updateUser({password:r});return{data:o,error:s}}export{i,r as n,a as r,t};