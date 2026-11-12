
-- Base de datos de HeladeriaAPI (SQL Server)
-- Se puede ejecutar varias veces sin duplicar datos.


IF DB_ID('HeladeriaAPI_DB') IS NULL
    CREATE DATABASE HeladeriaAPI_DB;
GO

USE HeladeriaAPI_DB;
GO

IF OBJECT_ID('dbo.Categorias') IS NULL
CREATE TABLE dbo.Categorias (
    CategoriaId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL
);

IF OBJECT_ID('dbo.Productos') IS NULL
CREATE TABLE dbo.Productos (
    ProductoId INT IDENTITY(1,1) PRIMARY KEY,
    CategoriaId INT NOT NULL REFERENCES dbo.Categorias(CategoriaId),
    Nombre NVARCHAR(100) NOT NULL,
    Precio DECIMAL(10,2) NOT NULL,
    Activo BIT NOT NULL DEFAULT 1
);

IF OBJECT_ID('dbo.Mesas') IS NULL
CREATE TABLE dbo.Mesas (
    MesaId INT IDENTITY(1,1) PRIMARY KEY,
    Numero INT NOT NULL,
    Estado NVARCHAR(30) NOT NULL DEFAULT 'Disponible'
);

IF OBJECT_ID('dbo.Pedidos') IS NULL
CREATE TABLE dbo.Pedidos (
    PedidoId INT IDENTITY(1,1) PRIMARY KEY,
    MesaId INT NOT NULL REFERENCES dbo.Mesas(MesaId),
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Estado NVARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    Total DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Tamaños por categoría (ej. Helados: Pequeño, Mediano, Grande).
-- PrecioAdicional se suma al precio base del producto.
IF OBJECT_ID('dbo.Tamanos') IS NULL
CREATE TABLE dbo.Tamanos (
    TamanoId INT IDENTITY(1,1) PRIMARY KEY,
    CategoriaId INT NOT NULL REFERENCES dbo.Categorias(CategoriaId),
    Nombre NVARCHAR(50) NOT NULL,
    PrecioAdicional DECIMAL(10,2) NOT NULL DEFAULT 0,
    Orden INT NOT NULL DEFAULT 0,
    Activo BIT NOT NULL DEFAULT 1
);

IF OBJECT_ID('dbo.DetallesPedido') IS NULL
CREATE TABLE dbo.DetallesPedido (
    DetallePedidoId INT IDENTITY(1,1) PRIMARY KEY,
    PedidoId INT NOT NULL REFERENCES dbo.Pedidos(PedidoId),
    ProductoId INT NOT NULL REFERENCES dbo.Productos(ProductoId),
    TamanoId INT NULL REFERENCES dbo.Tamanos(TamanoId),
    Cantidad INT NOT NULL,
    Sabores NVARCHAR(200) NULL,
    Toppings NVARCHAR(200) NULL,
    Observaciones NVARCHAR(300) NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL
);
GO

-- Usuarios del personal (los clientes no tienen usuario). ClaveHash usa el formato de ASP.NET Identity.
IF OBJECT_ID('dbo.Usuarios') IS NULL
CREATE TABLE dbo.Usuarios (
    UsuarioId INT IDENTITY(1,1) PRIMARY KEY,
    NombreUsuario NVARCHAR(50) NOT NULL CONSTRAINT UQ_Usuarios_NombreUsuario UNIQUE,
    Nombre NVARCHAR(100) NOT NULL,
    ClaveHash NVARCHAR(500) NOT NULL,
    Rol NVARCHAR(30) NOT NULL DEFAULT 'Empleado',
    Activo BIT NOT NULL DEFAULT 1
);
GO

-- Actualización de bases creadas con una versión anterior del script (sin tamaños).
IF COL_LENGTH('dbo.DetallesPedido', 'TamanoId') IS NULL
    ALTER TABLE dbo.DetallesPedido
        ADD TamanoId INT NULL CONSTRAINT FK_DetallesPedido_Tamanos REFERENCES dbo.Tamanos(TamanoId);
GO

-- Datos de ejemplo (solo si las tablas estan vacias)
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias)
    INSERT INTO dbo.Categorias (Nombre)
    VALUES (N'Helados'), (N'Bebidas'), (N'Postres'), (N'Toppings');

IF NOT EXISTS (SELECT 1 FROM dbo.Productos)
    INSERT INTO dbo.Productos (CategoriaId, Nombre, Precio, Activo)
    SELECT c.CategoriaId, p.Nombre, p.Precio, 1
    FROM (VALUES
        (N'Helados',  N'Helado de Vainilla',    5000),
        (N'Helados',  N'Helado de Chocolate',   5500),
        (N'Helados',  N'Helado de Fresa',       5000),
        (N'Bebidas',  N'Malteada de Chocolate', 9000),
        (N'Bebidas',  N'Jugo Natural',          6000),
        (N'Postres',  N'Brownie',               7000),
        (N'Toppings', N'Chispas de Chocolate',  1500),
        (N'Toppings', N'Man' + NCHAR(237),      1000)  -- "Maní" (NCHAR evita problemas de codificación del archivo)
    ) AS p (Categoria, Nombre, Precio)
    JOIN dbo.Categorias c ON c.Nombre = p.Categoria;

IF NOT EXISTS (SELECT 1 FROM dbo.Mesas)
    INSERT INTO dbo.Mesas (Numero, Estado)
    VALUES (1, N'Disponible'), (2, N'Disponible'), (3, N'Disponible'), (4, N'Disponible'), (5, N'Disponible');

-- Tamaños de ejemplo: el precio del producto es el del tamaño base y cada tamaño suma su adicional.
IF NOT EXISTS (SELECT 1 FROM dbo.Tamanos)
    INSERT INTO dbo.Tamanos (CategoriaId, Nombre, PrecioAdicional, Orden, Activo)
    SELECT c.CategoriaId, t.Nombre, t.PrecioAdicional, t.Orden, 1
    FROM (VALUES
        (N'Helados', N'Peque' + NCHAR(241) + N'o', 0,    1),  -- "Pequeño"
        (N'Helados', N'Mediano',                   2000, 2),
        (N'Helados', N'Grande',                    4000, 3),
        (N'Bebidas', N'Mediano',                   0,    1),
        (N'Bebidas', N'Grande',                    2500, 2)
    ) AS t (Categoria, Nombre, PrecioAdicional, Orden)
    JOIN dbo.Categorias c ON c.Nombre = t.Categoria;

-- Administrador inicial: usuario "admin", contraseña "HeladApp2026".
-- CÁMBIALA en "Mi cuenta" la primera vez que entres (solo se crea si no hay ningún usuario).
IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios)
    INSERT INTO dbo.Usuarios (NombreUsuario, Nombre, ClaveHash, Rol, Activo)
    VALUES (N'admin', N'Administrador',
            N'AQAAAAIAAYagAAAAEPOWvPtfnmA0RfvTPpxuz77lrY+f17UtrZfnCZrxsVm7nwM2s0HkNQUIHnMs6DULeA==',
            N'Administrador', 1);

-- Cuentas del equipo de desarrollo, contraseña inicial "12345678".
-- Se agregan también a bases existentes si todavía no están. Cambien la contraseña en "Mi cuenta".
INSERT INTO dbo.Usuarios (NombreUsuario, Nombre, ClaveHash, Rol, Activo)
SELECT e.NombreUsuario, e.Nombre, e.ClaveHash, e.Rol, 1
FROM (VALUES
    (N'excainer',  N'Juan Gallo',       N'Administrador',
     N'AQAAAAIAAYagAAAAEEkBEAPa84MQbqbCO6yFUYumf8UWAftVLYsT/dOG4ik1KguKAeU2k5CZaq0mWyJmZg=='),
    (N'alejandro', N'Alejandro Ortega', N'Administrador',
     N'AQAAAAIAAYagAAAAEHmtJ4mY9JvtQVlloG/wyN1OtvmCen0lD7xFijQku/KW26HFhK7hcNhnlvhspwdnjg=='),
    (N'alexander', N'Alexander V' + NCHAR(233) + N'lez', N'Administrador',  -- "Vélez"
     N'AQAAAAIAAYagAAAAEAw2SAqi6tvfUyn2Q0Iv0HrrF3XPvFKAT3wnaijdETBGjk6d1xHJ93v1tToP+iYNGQ=='),
    (N'pedro',     N'Pedro Vidal',      N'Administrador',
     N'AQAAAAIAAYagAAAAENL3W74GXlzcS97nNh/lEiL0nTkvk58wp5XNTt47HaPytgJgRooIqxsvMls55NSIqA=='),
    (N'juan',      N'Juan Silva',       N'Empleado',
     N'AQAAAAIAAYagAAAAEEAGAPnshm3o4QFS0gB8pLFb8mcXwkjsZ0EX0b7eplGC2E4PX9JjApf7RUhQf76STA==')
) AS e (NombreUsuario, Nombre, Rol, ClaveHash)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Usuarios u WHERE u.NombreUsuario = e.NombreUsuario);
GO