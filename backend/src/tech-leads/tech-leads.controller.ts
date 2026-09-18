import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TechLeadsService } from './tech-leads.service';
import { CreateTechLeadDto } from './dto/create-tech-lead.dto';
import { UpdateTechLeadDto } from './dto/update-tech-lead.dto';
import { TechLeadStatus } from './enums/tech-lead-status.enum';

@Controller('tech-leads')
export class TechLeadsController {
  constructor(private readonly techLeadsService: TechLeadsService) {}

  /**
   * POST /api/tech-leads - Create a new Tech Lead
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTechLeadDto: CreateTechLeadDto) {
    return this.techLeadsService.create(createTechLeadDto);
  }

  /**
   * GET /api/tech-leads/active - Retrieve only active Tech Leads
   * Placed before :id to prevent route collision
   */
  @Get('active')
  async findActive() {
    return this.techLeadsService.findActive();
  }

  /**
   * GET /api/tech-leads - Retrieve all Tech Leads (optionally filtered by ?status=ACTIVE)
   */
  @Get()
  async findAll(@Query('status') status?: TechLeadStatus) {
    return this.techLeadsService.findAll(status);
  }

  /**
   * GET /api/tech-leads/:id - Retrieve a single Tech Lead by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.techLeadsService.findOne(id);
  }

  /**
   * PATCH /api/tech-leads/:id - Update Tech Lead
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTechLeadDto: UpdateTechLeadDto,
  ) {
    return this.techLeadsService.update(id, updateTechLeadDto);
  }

  /**
   * DELETE /api/tech-leads/:id - Delete or deactivate Tech Lead
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.techLeadsService.remove(id);
  }
}
