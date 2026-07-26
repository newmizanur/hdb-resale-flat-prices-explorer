resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

module "api_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  service_name       = "api"
  cluster_id         = aws_ecs_cluster.main.id
  image              = var.api_image
  container_port     = 3000
  cpu                = 256
  memory             = 512
  desired_count      = 1
  subnets            = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.ecs_service.id]
  target_group_arn   = aws_lb_target_group.api.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  aws_region         = var.aws_region

  environment = [
    { name = "DB_HOST", value = aws_db_instance.postgres.address },
    { name = "DB_PORT", value = "5432" },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = var.db_name },
    { name = "DB_SYNCHRONIZE", value = "false" },
    { name = "WEB_ORIGIN", value = "http://${aws_lb.main.dns_name}" },
  ]

  depends_on = [aws_lb_listener.http]
}

module "web_service" {
  source = "./modules/ecs-service"

  project_name       = var.project_name
  service_name       = "web"
  cluster_id         = aws_ecs_cluster.main.id
  image              = var.web_image
  container_port     = 80
  cpu                = 256
  memory             = 512
  desired_count      = 1
  subnets            = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.ecs_service.id]
  target_group_arn   = aws_lb_target_group.web.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  aws_region         = var.aws_region

  environment = [
    { name = "VITE_API_URL", value = "http://${aws_lb.main.dns_name}/api" },
  ]

  depends_on = [aws_lb_listener.http]
}
