unit uPrincipal;

{$mode delphi}{$H+}

interface

uses
      Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls, StdCtrls,
			EditBtn;

type

			{ TForm1 }

      TForm1 = class(TForm)
						btRefresh: TButton;
						btConfig: TButton;
						DateTimePicker1: TDateEdit;
						DateTimePicker2: TDateEdit;
						Label1: TLabel;
						Label2: TLabel;
						lbServer_Port_Ativa: TLabel;
						TreeView_Log: TMemo;
						pnHeader: TPanel;
						pnFilter: TPanel;
						pnBody: TPanel;
						pnFooter: TPanel;
      private

      public

      end;

var
      Form1: TForm1;

implementation

{$R *.lfm}

end.

