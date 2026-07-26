variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project_name" {
  type    = string
  default = "hdb-resale-explorer"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_name" {
  type    = string
  default = "hdb_resale"
}

variable "db_username" {
  type      = string
  default   = "postgres"
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_image" {
  type    = string
  default = "hdb-resale-explorer-api:latest"
}

variable "web_image" {
  type    = string
  default = "hdb-resale-explorer-web:latest"
}
