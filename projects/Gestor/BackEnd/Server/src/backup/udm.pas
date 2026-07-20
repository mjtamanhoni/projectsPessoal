unit uDm;

{$mode ObjFPC}{$H+}

interface

uses
      Classes, SysUtils, ZConnection, ZDataset;

type

			{ TDataModule1 }

      TDataModule1 = class(TDataModule)
						ZConnection: TZConnection;
						ZQuery1: TZQuery;
						ZTransaction: TZTransaction;
      private

      public

      end;

var
      DataModule1: TDataModule1;

implementation

{$R *.lfm}

end.

