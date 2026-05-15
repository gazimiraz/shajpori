import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ----------------------------------------------------------------
  // GET /users (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Get()
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query() filters: PaginationDto,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.usersService.findAll({ ...filters, role, isActive });
  }

  // ----------------------------------------------------------------
  // GET /users/me (authenticated)
  // ----------------------------------------------------------------
  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  // ----------------------------------------------------------------
  // PATCH /users/me (authenticated)
  // ----------------------------------------------------------------
  @Auth()
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  // ----------------------------------------------------------------
  // POST /users/me/avatar (authenticated)
  // ----------------------------------------------------------------
  @Auth()
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Avatar image file' })
  @ApiOperation({ summary: 'Upload or replace profile avatar' })
  uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(userId, file);
  }

  // ----------------------------------------------------------------
  // DELETE /users/me (authenticated)
  // ----------------------------------------------------------------
  @Auth()
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate current user account' })
  deleteMe(@CurrentUser('id') userId: string) {
    return this.usersService.delete(userId);
  }

  // ----------------------------------------------------------------
  // GET /users/:id (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN', 'MANAGER')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user by ID (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  // ----------------------------------------------------------------
  // DELETE /users/:id (admin)
  // ----------------------------------------------------------------
  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user account (admin)' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.delete(id);
  }

  // ================================================================
  // Addresses
  // ================================================================

  @Auth()
  @Get('me/addresses')
  @ApiOperation({ summary: 'List current user addresses' })
  getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Auth()
  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address' })
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Auth()
  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(addressId, dto);
  }

  @Auth()
  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address' })
  deleteAddress(@Param('addressId', ParseUUIDPipe) addressId: string) {
    return this.usersService.deleteAddress(addressId);
  }

  @Auth()
  @Patch('me/addresses/:addressId/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an address as default' })
  setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  // ================================================================
  // Order history
  // ================================================================

  @Auth()
  @Get('me/orders')
  @ApiOperation({ summary: 'Get order history for current user' })
  getOrderHistory(
    @CurrentUser('id') userId: string,
    @Query() filters: PaginationDto,
  ) {
    return this.usersService.getOrderHistory(userId, filters);
  }

  // ================================================================
  // Loyalty
  // ================================================================

  @Auth()
  @Get('me/loyalty')
  @ApiOperation({ summary: 'Get current user loyalty balance and transaction history' })
  getLoyaltyBalance(@CurrentUser('id') userId: string) {
    return this.usersService.getLoyaltyBalance(userId);
  }

  // ================================================================
  // Wishlist
  // ================================================================

  @Auth()
  @Get('me/wishlist')
  @ApiOperation({ summary: 'Get current user wishlist' })
  getWishlist(@CurrentUser('id') userId: string) {
    return this.usersService.getWishlist(userId);
  }

  @Auth()
  @Post('me/wishlist/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product in/out of wishlist' })
  toggleWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.usersService.toggleWishlist(userId, productId);
  }
}
