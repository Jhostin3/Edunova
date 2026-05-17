import{r as e}from"./index-CCITJ0gF.js";async function t(){let{data:t,error:n}=await e.from(`representantes`).select(`
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
      estado,
      created_at,
      updated_at
    `).order(`created_at`,{ascending:!1});return{data:t??[],error:n}}async function n(t){let{data:n,error:r}=await e.from(`representantes`).insert(t).select().single();return{data:n,error:r}}async function r(t){let n=String(t??``).trim();if(!n)return{data:null,error:null};let{data:r,error:i}=await e.from(`representantes`).select(`
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
      estado,
      created_at,
      updated_at
    `).eq(`cedula`,n).limit(1).maybeSingle();return{data:r,error:i}}async function i(t,n){let{data:r,error:i}=await e.from(`representantes`).update(n).eq(`id`,t).select().single();return{data:r,error:i}}export{i,r as n,t as r,n as t};