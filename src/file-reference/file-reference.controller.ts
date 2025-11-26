// src/file-reference/file-reference.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, Req, UseInterceptors, UploadedFile, Res, Header, StreamableFile, NotFoundException, BadRequestException } from '@nestjs/common';
import { FileReferenceService } from './file-reference.service';
import { CreateFileReferenceDto } from './dto/create-file-reference.dto';
import { UpdateFileReferenceDto } from './dto/update-file-reference.dto';
import { FilterFileReferenceDto } from './dto/filter-file-reference.dto';
import { FileReference } from './entities/file-reference.entity';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery, ApiBody, ApiParam, ApiConsumes, ApiBadRequestResponse, ApiNotFoundResponse, ApiConflictResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
import { CustomRequest } from 'src/Interceptor/custom-request.interface';
// import { FileType } from 'src/enums'; // FileType n'est plus directement utilisé dans le contrôleur, donc on peut le retirer si non utilisé ailleurs.
import { Multer } from 'multer';

@ApiTags('Références de Fichiers') // Traduction du tag
@Controller('file-references')
export class FileReferenceController {
  constructor(private readonly fileReferenceService: FileReferenceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Télécharger un fichier et créer une référence de fichier' }) // Traduction
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Le fichier à téléverser.', // Traduction
        },
        label: {
          type: 'string',
          description: 'Un libellé lisible par l\'humain pour le fichier.', // Traduction
          example: 'Contrat Locataire 2024', // Traduction
        },
        // Le champ 'fileType' a été retiré car il est maintenant inféré automatiquement par le service.
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Fichier et référence créés avec succès.', type: FileReference }) // Traduction
  @ApiResponse({ status: 400, description: 'Mauvaise requête : Fichier invalide ou données d\'entrée.' }) // Traduction
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur : Échec du téléversement ou de l\'enregistrement de la référence de fichier.' }) // Traduction
  async uploadFile(
    @UploadedFile() file: Multer.File,
    @Body() createFileReferenceDto: CreateFileReferenceDto,
    @Req() req: CustomRequest,
  ): Promise<FileReference> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.'); // Traduction
    }
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    const uploadedBy: Types.ObjectId | null = req.user.userId ? new Types.ObjectId(req.user.userId) : null;
    return this.fileReferenceService.uploadAndCreate(tenantId, uploadedBy, file, createFileReferenceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer une liste de références de fichiers' }) // Traduction
  @ApiResponse({ status: 200, description: 'Liste des références de fichiers.', type: [FileReference] }) // Traduction
  @ApiQuery({ name: 'label', required: false, type: String, description: 'Filtrer par libellé de fichier (insensible à la casse).' }) // Traduction
  // L'ApiQuery pour 'fileType' a été retirée car le filtrage par ce champ n'est plus pris en charge via ce DTO.
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page.', example: 1 }) // Traduction
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page.', example: 10 }) // Traduction
  async findAll(
    @Query() filterDto: FilterFileReferenceDto,
    @Req() req: CustomRequest,
  ): Promise<{ fileReferences: FileReference[]; total: number, page: number, limit: number , totalPages: number}> {
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    return this.fileReferenceService.findAll(tenantId, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une seule référence de fichier par ID' }) // Traduction
  @ApiResponse({ status: 200, description: 'La référence de fichier trouvée.', type: FileReference }) // Traduction
  @ApiNotFoundResponse({ description: 'Référence de fichier introuvable ou n\'appartient pas à ce locataire.' }) // Traduction
  @ApiBadRequestResponse({ description: 'Format d\'ID invalide.' }) // Traduction
  @ApiParam({ name: 'id', description: 'L\'ID de la référence de fichier.', type: String, example: '60d5ec49f8a3c5a6d8b4567a' }) // Traduction
  async findOne(
    @Param('id') id: string,
    @Req() req: CustomRequest,
  ): Promise<FileReference> {
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    return this.fileReferenceService.findOne(tenantId, new Types.ObjectId(id));
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Télécharger un fichier par son ID de référence' }) // Traduction
  @ApiResponse({ status: 200, description: 'Le flux de fichier.' }) // Traduction
  @ApiNotFoundResponse({ description: 'Référence de fichier introuvable ou n\'appartient pas à ce locataire.' }) // Traduction
  @ApiBadRequestResponse({ description: 'Format d\'ID invalide.' }) // Traduction
  @ApiInternalServerErrorResponse({ description: 'Échec de la récupération du fichier depuis le système de stockage.' }) // Traduction
  @ApiParam({ name: 'id', description: 'L\'ID de la référence de fichier à télécharger.', type: String, example: '60d5ec49f8a3c5a6d8b4567a' }) // Traduction
  async downloadFile(
    @Param('id') id: string,
    @Req() req: CustomRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    const { stream, mimetype } = await this.fileReferenceService.getFileStream(tenantId, new Types.ObjectId(id));

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${id}.${mimetype.split('/')[1]}"`,
    });
    return new StreamableFile(stream);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une référence de fichier existante par ID' }) // Traduction
  @ApiResponse({ status: 200, description: 'La référence de fichier mise à jour.', type: FileReference }) // Traduction
  @ApiNotFoundResponse({ description: 'Référence de fichier introuvable ou n\'appartient pas à ce locataire.' }) // Traduction
  @ApiBadRequestResponse({ description: 'Données d\'entrée ou format d\'ID invalide.' }) // Traduction
  @ApiParam({ name: 'id', description: 'L\'ID de la référence de fichier à mettre à jour.', type: String, example: '60d5ec49f8a3c5a6d8b4567a' }) // Traduction
  @ApiBody({ type: UpdateFileReferenceDto, description: 'Données pour mettre à jour la référence de fichier.' }) // Traduction
  async update(
    @Param('id') id: string,
    @Body() updateFileReferenceDto: UpdateFileReferenceDto,
    @Req() req: CustomRequest,
  ): Promise<FileReference> {
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    return this.fileReferenceService.update(tenantId, new Types.ObjectId(id), updateFileReferenceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une référence de fichier et le fichier associé du stockage par ID' }) // Traduction
  @ApiResponse({ status: 200, description: 'Message indiquant la suppression réussie.', schema: { example: { message: 'Référence de fichier supprimée avec succès.' } } }) // Traduction
  @ApiNotFoundResponse({ description: 'Référence de fichier introuvable ou n\'appartient pas à ce locataire.' }) // Traduction
  @ApiBadRequestResponse({ description: 'Format d\'ID invalide.' }) // Traduction
  @ApiInternalServerErrorResponse({ description: 'Échec de la suppression du fichier du système de stockage ou de l\'enregistrement de la base de données.' }) // Traduction
  @ApiParam({ name: 'id', description: 'L\'ID de la référence de fichier à supprimer.', type: String, example: '60d5ec49f8a3c5a6d8b4567a' }) // Traduction
  async remove(
    @Param('id') id: string,
    @Req() req: CustomRequest,
  ): Promise<{ message: string }> {
    const tenantId: Types.ObjectId = new Types.ObjectId(req.user.tenantId);
    return this.fileReferenceService.remove(tenantId, new Types.ObjectId(id));
  }

 @Get(':idOrPath/preview')
@ApiOperation({ summary: 'Prévisualiser un fichier par ID ou chemin complet' })
@ApiResponse({ status: 200, description: 'Le flux du fichier pour prévisualisation.' })
@ApiNotFoundResponse({ description: 'Fichier introuvable ou ne peut pas être prévisualisé.' })
@ApiParam({ name: 'idOrPath', description: 'ID de référence ou chemin complet du fichier.', type: String })
async previewFile(
  @Param('idOrPath') idOrPath: string,
  @Res() res: Response,
) {
  try {
    let identifier: Types.ObjectId | string = idOrPath;

    if (!idOrPath.startsWith('/')) {
      if (Types.ObjectId.isValid(idOrPath)) {
        identifier = new Types.ObjectId(idOrPath);
      } else {
        identifier = decodeURIComponent(`/${idOrPath}`);
      }
    } else {
      identifier = decodeURIComponent(idOrPath);
    }

    const { stream, mimetype } = await this.fileReferenceService.getFileStreamPreview(identifier);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  } catch (error) {
    throw new NotFoundException('Fichier introuvable ou ne peut pas être prévisualisé.');
  }
}


}