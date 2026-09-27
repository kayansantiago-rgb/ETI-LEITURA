export default function PageIntro({section,title,description,children}) {
 return <header className="inner-intro"><div><p className="eyebrow">{section}</p><h1>{title}</h1><p className="inner-description">{description}</p></div>{children&&<div className="inner-intro-action">{children}</div>}</header>;
}
