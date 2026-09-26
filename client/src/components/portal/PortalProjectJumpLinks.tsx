import ProjectJumpNav, { PORTAL_JUMP_SECTIONS } from '../projects/ProjectJumpNav';

interface PortalProjectJumpLinksProps {
  projectId: string;
  inPage?: boolean;
  className?: string;
}

function PortalProjectJumpLinks({
  projectId,
  inPage = false,
  className = '',
}: PortalProjectJumpLinksProps) {
  return (
    <ProjectJumpNav
      sections={PORTAL_JUMP_SECTIONS}
      hrefPrefix={inPage ? undefined : `/portal/projects/${projectId}`}
      inPage={inPage}
      tone="portal"
      className={className}
    />
  );
}

export default PortalProjectJumpLinks;
