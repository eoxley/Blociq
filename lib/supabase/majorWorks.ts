import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getMajorWorksProjectContext(projectId: string) {
  try {
    // Fetch specific project data
    const { data: project, error } = await supabase
      .from('major_works_projects')
      .select(`
        *,
        buildings (
          id,
          name,
          address
        ),
        major_works_logs (
          id,
          action,
          description,
          timestamp,
          metadata
        ),
        major_works_documents (
          id,
          file_name,
          document_tag,
          uploaded_at,
          description
        )
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching major works project context:', error);
      return null;
    }

    if (!project) {
      return 'Project not found.';
    }

    const buildingName = project.buildings?.name || 'Unknown Building';
    const projectName = project.title || project.name || 'Untitled Project';
    const status = project.status || 'unknown';
    const estimatedCost = project.estimated_cost ? `£${project.estimated_cost.toLocaleString()}` : 'Not specified';
    const actualCost = project.actual_cost ? `£${project.actual_cost.toLocaleString()}` : 'Not specified';
    const completionPercentage = project.completion_percentage || 0;
    
    // Get latest update
    const latestUpdate = project.major_works_logs?.[0];
    const lastUpdate = latestUpdate ? 
      ` (Last update: ${new Date(latestUpdate.timestamp).toLocaleDateString()} - ${latestUpdate.action})` : 
      '';

    // Get project documents
    const documents = project.major_works_documents || [];
    const documentsList = documents.length > 0 ? 
      documents.map((doc: any) => `- ${doc.file_name} (${doc.document_tag || 'other'})`).join('\n') : 
      'No documents uploaded';

    let projectContext = `MAJOR WORKS PROJECT DETAILS:\n\n`;
    projectContext += `Project: ${projectName}\n`;
    projectContext += `Building: ${buildingName}\n`;
    projectContext += `Status: ${status}\n`;
    projectContext += `Completion: ${completionPercentage}%\n`;
    projectContext += `Estimated Cost: ${estimatedCost}\n`;
    projectContext += `Actual Cost: ${actualCost}\n`;
    
    if (project.description) {
      projectContext += `Description: ${project.description}\n`;
    }
    
    if (project.contractor_name) {
      projectContext += `Contractor: ${project.contractor_name}\n`;
    }
    
    if (project.expected_completion_date) {
      projectContext += `Expected Completion: ${new Date(project.expected_completion_date).toLocaleDateString()}\n`;
    }
    
    if (project.actual_completion_date) {
      projectContext += `Actual Completion: ${new Date(project.actual_completion_date).toLocaleDateString()}\n`;
    }
    
    projectContext += `\nTimeline:\n`;
    if (project.notice_of_intention_date) {
      projectContext += `- Notice of Intention: ${new Date(project.notice_of_intention_date).toLocaleDateString()}\n`;
    }
    if (project.statement_of_estimates_date) {
      projectContext += `- Statement of Estimates: ${new Date(project.statement_of_estimates_date).toLocaleDateString()}\n`;
    }
    if (project.contractor_appointed_date) {
      projectContext += `- Contractor Appointed: ${new Date(project.contractor_appointed_date).toLocaleDateString()}\n`;
    }
    
    projectContext += `\nDocuments:\n${documentsList}\n`;
    projectContext += `\nLatest Update: ${lastUpdate}`;

    return projectContext;
  } catch (error) {
    console.error('Error in getMajorWorksProjectContext:', error);
    return null;
  }
}

export async function getMajorWorksContext(buildingId: string) {
  try {
    const today = new Date();
    
    // Fetch major works projects with detailed information
    const { data: majorWorksProjects, error } = await supabase
      .from('major_works_projects')
      .select(`
        *,
        buildings (
          id,
          name,
          address
        ),
        major_works_logs (
          id,
          action,
          description,
          timestamp,
          metadata
        )
      `)
      .eq('building_id', buildingId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching major works context:', error);
      return null;
    }

    if (!majorWorksProjects || majorWorksProjects.length === 0) {
      return 'No major works projects found for this building.';
    }

    // Calculate project status and categorize items
    const activeProjects: string[] = [];
    const completedProjects: string[] = [];
    const plannedProjects: string[] = [];
    const overdueProjects: string[] = [];

    majorWorksProjects.forEach(project => {
      const buildingName = project.buildings?.name || 'Unknown Building';
      const projectName = project.title || project.name || 'Untitled Project';
      const status = project.status || 'unknown';
      const estimatedCost = project.estimated_cost ? `£${project.estimated_cost.toLocaleString()}` : 'Not specified';
      const actualCost = project.actual_cost ? `£${project.actual_cost.toLocaleString()}` : 'Not specified';
      const completionPercentage = project.completion_percentage || 0;
      
      let statusText = status;
      let isOverdue = false;
      
      // Check if project is overdue based on expected completion date
      if (project.expected_completion_date) {
        const expectedDate = new Date(project.expected_completion_date);
        const daysUntilDue = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0 && status !== 'completed') {
          isOverdue = true;
          statusText = `${status} (OVERDUE by ${Math.abs(daysUntilDue)} days)`;
        }
      }

      // Get latest update
      const latestUpdate = project.major_works_logs?.[0];
      const lastUpdate = latestUpdate ? 
        ` (Last update: ${new Date(latestUpdate.timestamp).toLocaleDateString()} - ${latestUpdate.action})` : 
        '';

      const projectInfo = `${projectName} (${statusText}): ${completionPercentage}% complete, Est: ${estimatedCost}, Actual: ${actualCost}${lastUpdate}`;
      
      if (isOverdue) {
        overdueProjects.push(projectInfo);
      } else if (status === 'completed') {
        completedProjects.push(projectInfo);
      } else if (status === 'works_in_progress' || status === 'contractor_appointed') {
        activeProjects.push(projectInfo);
      } else {
        plannedProjects.push(projectInfo);
      }
    });

    // Build comprehensive major works context
    let majorWorksContext = 'LIVE MAJOR WORKS STATUS:\n\n';
    
    if (overdueProjects.length > 0) {
      majorWorksContext += `🚨 OVERDUE PROJECTS:\n${overdueProjects.join('\n')}\n\n`;
    }
    
    if (activeProjects.length > 0) {
      majorWorksContext += `🏗️ ACTIVE PROJECTS:\n${activeProjects.join('\n')}\n\n`;
    }
    
    if (plannedProjects.length > 0) {
      majorWorksContext += `📋 PLANNED PROJECTS:\n${plannedProjects.join('\n')}\n\n`;
    }
    
    if (completedProjects.length > 0) {
      majorWorksContext += `✅ COMPLETED PROJECTS:\n${completedProjects.join('\n')}\n\n`;
    }

    // Add summary statistics
    const totalProjects = majorWorksProjects.length;
    const overdueCount = overdueProjects.length;
    const activeCount = activeProjects.length;
    const plannedCount = plannedProjects.length;
    const completedCount = completedProjects.length;
    
    // Calculate total estimated and actual costs
    const totalEstimatedCost = majorWorksProjects.reduce((sum, project) => 
      sum + (project.estimated_cost || 0), 0);
    const totalActualCost = majorWorksProjects.reduce((sum, project) => 
      sum + (project.actual_cost || 0), 0);
    
    majorWorksContext += `SUMMARY: ${totalProjects} total projects - ${overdueCount} overdue, ${activeCount} active, ${plannedCount} planned, ${completedCount} completed`;
    majorWorksContext += `\nTOTAL ESTIMATED COST: £${totalEstimatedCost.toLocaleString()}`;
    majorWorksContext += `\nTOTAL ACTUAL COST: £${totalActualCost.toLocaleString()}`;

    return majorWorksContext;
  } catch (error) {
    console.error('Error in getMajorWorksContext:', error);
    return null;
  }
} 