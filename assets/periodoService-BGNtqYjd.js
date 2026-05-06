import{r as e}from"./index-Bi8JBEUJ.js";function t(e){return{nombre:e.nombre?.trim()??``,fecha_inicio:e.fecha_inicio||null,fecha_fin:e.fecha_fin||null,activo:!!e.activo}}async function n(t=null){let n=e.from(`periodos_escolares`).update({activo:!1});t&&(n=n.neq(`id`,t));let{error:r}=await n.eq(`activo`,!0);if(r)throw r}async function r(){let{data:t,error:n}=await e.from(`periodos_escolares`).select(`
      id,
      nombre,
      fecha_inicio,
      fecha_fin,
      activo,
      created_at
    `).order(`created_at`,{ascending:!1});return{data:t??[],error:n}}async function i(r){try{let i=t(r);i.activo&&await n();let{data:a,error:o}=await e.from(`periodos_escolares`).insert(i).select().single();return{data:a,error:o}}catch(e){return{data:null,error:e instanceof Error?e:Error(`Error al crear periodo lectivo`)}}}async function a(r,i){try{let a=t(i);a.activo&&await n(r);let{data:o,error:s}=await e.from(`periodos_escolares`).update(a).eq(`id`,r).select().single();return{data:o,error:s}}catch(e){return{data:null,error:e instanceof Error?e:Error(`Error al actualizar periodo lectivo`)}}}async function o(t){try{await n(t);let{data:r,error:i}=await e.from(`periodos_escolares`).update({activo:!0}).eq(`id`,t).select().single();return{data:r,error:i}}catch(e){return{data:null,error:e instanceof Error?e:Error(`Error al activar periodo lectivo`)}}}export{a as i,i as n,r,o as t};